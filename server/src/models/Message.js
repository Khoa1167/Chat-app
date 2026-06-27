const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content:   { type: String, required: true, maxlength: 2000 },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  type:      { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  replyTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [{ emoji: String, users: [{ type: mongoose.Schema.Types.ObjectId }] }],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);