const mongoose = require('mongoose');
const crypto   = require('crypto');

const roomSchema = new mongoose.Schema({
  name:        { type: String, trim: true },
  description: { type: String, default: '' },
  isPrivate:   { type: Boolean, default: false },
  isDM:        { type: Boolean, default: false },
  inviteCode:  {
    type: String,
    default: () => crypto.randomBytes(6).toString('hex'), // mã 12 ký tự ngẫu nhiên
    unique: true,
  },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);