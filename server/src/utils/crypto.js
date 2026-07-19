const crypto = require('crypto');

// Đọc khóa mã hóa từ .env (phải chuyển từ chuỗi Hex thành Buffer 32 bytes)
const getEncryptionKey = () => {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    console.error('⚠️ [Crypto] ENCRYPTION_KEY is not defined in .env! Using a fallback key for development.');
    // Khóa fallback để tránh sập server khi chưa config, tuy nhiên cần log cảnh báo
    return crypto.scryptSync('fallback_secret_chat_app_2026', 'salt', 32);
  }
  
  try {
    const key = Buffer.from(hexKey, 'hex');
    if (key.length !== 32) {
      throw new Error(`Invalid key length: ${key.length} bytes. Must be 32 bytes.`);
    }
    return key;
  } catch (err) {
    console.error('⚠️ [Crypto] Invalid ENCRYPTION_KEY format! Key must be a 64-character hex string. Deriving key via scrypt.', err.message);
    return crypto.scryptSync(hexKey, 'salt', 32);
  }
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // AES-GCM yêu cầu IV 12 bytes

// Thiết lập các khóa RSA cho mã hóa lai (Hybrid Encryption)
const fs = require('fs');
const path = require('path');

let privateKey, publicKey;

// 1. Ưu tiên đọc từ biến môi trường (tránh mất khóa khi deploy lên server cloud có ephemeral filesystem)
const envPrivateKey = process.env.RSA_PRIVATE_KEY;
const envPublicKey = process.env.RSA_PUBLIC_KEY;

if (envPrivateKey && envPublicKey) {
  privateKey = envPrivateKey.replace(/\\n/g, '\n');
  publicKey = envPublicKey.replace(/\\n/g, '\n');
} else {
  // 2. Fallback: tự động tạo hoặc đọc từ thư mục local keys/ nếu chưa cấu hình biến môi trường
  const PRIVATE_KEY_PATH = path.join(__dirname, '../../keys/private.pem');
  const PUBLIC_KEY_PATH = path.join(__dirname, '../../keys/public.pem');

  const keysDir = path.join(__dirname, '../../keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  try {
    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
      console.log('🔑 [Crypto] Generating RSA Key Pair for Hybrid Encryption...');
      const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });
      fs.writeFileSync(PRIVATE_KEY_PATH, privKey);
      fs.writeFileSync(PUBLIC_KEY_PATH, pubKey);
      privateKey = privKey;
      publicKey = pubKey;
    } else {
      privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
      publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    }
  } catch (err) {
    console.error('❌ [Crypto] Error initializing RSA keys:', err);
  }
}

/**
 * Mã hóa chuỗi văn bản bằng mã hóa lai (RSA + AES-256-GCM)
 * @param {string} text - Văn bản cần mã hóa
 * @returns {object} { content: string (base64), iv: string (base64), tag: string (base64), encryptedKey: string (base64) }
 */
const encrypt = (text) => {
  if (!text) return { content: '', iv: '', tag: '', encryptedKey: '' };
  
  try {
    // 1. Sinh khóa đối xứng ngẫu nhiên cho phiên gửi này (AES session key)
    const sessionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 2. Mã hóa tin nhắn bằng khóa đối xứng vừa sinh
    const cipher = crypto.createCipheriv(ALGORITHM, sessionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');
    
    // 3. Mã hóa khóa đối xứng bằng khóa công khai RSA (Khóa bất đối xứng)
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      sessionKey
    );
    
    return {
      content: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      encryptedKey: encryptedKey.toString('base64')
    };
  } catch (err) {
    console.error('[Crypto] Hybrid encryption error:', err);
    throw err;
  }
};

/**
 * Giải mã chuỗi văn bản bằng mã hóa lai (RSA + AES-256-GCM)
 * @param {string} content - Chuỗi đã mã hóa (base64)
 * @param {string} iv - Vector khởi tạo (base64)
 * @param {string} tag - Thẻ xác thực (base64)
 * @param {string} encryptedKey - Khóa đối xứng đã mã hóa bằng RSA (base64)
 * @returns {string} Văn bản gốc đã giải mã
 */
const decrypt = (content, iv, tag, encryptedKey) => {
  if (!content) return '';
  // Nếu thiếu IV hoặc Tag, giả định đây là tin nhắn chưa mã hóa (tin nhắn cũ trước khi cập nhật E2EE)
  if (!iv || !tag) {
    return content;
  }
  
  try {
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    let decryptionKey;
    
    if (encryptedKey && privateKey) {
      // 1. Giải mã khóa đối xứng (Session Key) bằng khóa bí mật RSA
      decryptionKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedKey, 'base64')
      );
    } else {
      // 2. Fallback nếu không có encryptedKey (sử dụng khóa đối xứng tĩnh cũ từ .env)
      decryptionKey = ENCRYPTION_KEY;
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, decryptionKey, ivBuffer);
    decipher.setAuthTag(tagBuffer);
    
    let decrypted = decipher.update(content, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Hybrid decryption error (possibility of invalid key or tampered data):', err.message);
    // Trả về bản mã hoặc thông báo lỗi thay vì làm sập ứng dụng nếu có lỗi giải mã dữ liệu cũ
    return '[Lỗi Giải Mã Tin Nhắn]';
  }
};

module.exports = {
  encrypt,
  decrypt
};
