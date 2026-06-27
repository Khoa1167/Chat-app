const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTPEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Chat App" <${process.env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Mã xác thực OTP - Chat App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 12px;">
        <h2 style="color: #5b5bd6; margin-bottom: 8px;">Chat App</h2>
        <p style="color: #444; margin-bottom: 24px;">Xin chào! Đây là mã OTP để xác thực tài khoản của bạn:</p>
        <div style="background: #f5f5ff; border: 2px dashed #5b5bd6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #5b5bd6;">
            ${otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">⏰ Mã có hiệu lực trong <strong>5 phút</strong></p>
        <p style="color: #666; font-size: 14px;">🔒 Không chia sẻ mã này với bất kỳ ai</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px;">Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

module.exports = { transporter, sendOTPEmail };