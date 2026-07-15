const router  = require('express').Router();
const Room    = require('../models/Room');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET /api/rooms — lấy danh sách phòng của user
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('members', 'username nickname avatar isOnline')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rooms — tạo phòng mới
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, isPrivate, members } = req.body;
    const room = await Room.create({
      name,
      description,
      isPrivate: isPrivate || false,
      members: [req.user._id, ...(members || [])],
      admins: [req.user._id],
      createdBy: req.user._id,
    });
    await room.populate('members', 'username nickname avatar isOnline');

    // Phát sự kiện room:added cho tất cả thành viên trong phòng đang online
    const io = req.app.get('socketio');
    if (io) {
      const allSockets = await io.fetchSockets();
      const memberIds = room.members.map(m => m._id.toString());
      allSockets.forEach(s => {
        if (s.data.user && memberIds.includes(s.data.user._id.toString())) {
          s.join(room._id.toString());
          s.emit('room:added', room);
        }
      });
    }

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/all — lấy tất cả phòng public để tham gia
router.get('/all', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('members', 'username nickname avatar isOnline')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:id/messages — lấy tin nhắn của phòng
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    
    // Kiểm tra xem user có phải thành viên phòng không (Sửa lỗi IDOR)
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' });
    if (!room.members.some(memberId => memberId.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Không có quyền truy cập tin nhắn của phòng này' });
    }

    const messages = await Message.find({
      room: req.params.id,
      isDeleted: false
    })
      .populate('sender', 'username nickname avatar') // Sửa lỗi hiển thị Nickname
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username nickname avatar' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rooms/:id/join — tham gia phòng
router.post('/:id/join', protect, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { returnDocument: 'after' }
    ).populate('members', 'username nickname avatar isOnline');

    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' });

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;