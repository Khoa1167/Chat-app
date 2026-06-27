const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  username:       { type: String, required: true },
  hashedPassword: { type: String, required: true },
  email:          { type: String, required: true },
  phone:          { type: String, default: '' },
  otp:            { type: String, required: true },
  expiresAt:      { type: Date, required: true },
  attempts:       { type: Number, default: 0 },
}, { timestamps: true });

// Tự động xóa document khi hết hạn
pendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Đảm bảo không trùng email
pendingUserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('PendingUser', pendingUserSchema);