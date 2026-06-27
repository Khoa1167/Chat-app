const router     = require('express').Router();
const Friendship = require('../models/Friendship');
const User       = require('../models/User');
const Room       = require('../models/Room');
const { protect } = require('../middleware/auth');

// GET /api/friends — lấy danh sách bạn bè
router.get('/', protect, async (req, res) => {
  try {
    const friends = await Friendship.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      status: 'accepted',
    })
      .populate('sender', 'username nickname avatar isOnline lastSeen')
      .populate('receiver', 'username nickname avatar isOnline lastSeen');
    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/friends/requests — lấy lời mời kết bạn đang chờ
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await Friendship.find({
      receiver: req.user._id,
      status: 'pending',
    }).populate('sender', 'username nickname avatar');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/friends/search?q=keyword — tìm kiếm user
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return res.status(400).json({ message: 'Nhập ít nhất 2 ký tự' });

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { nickname: { $regex: q, $options: 'i' } },
      ],
    }).select('username nickname avatar isOnline').limit(20);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/friends/request/:userId — gửi lời mời kết bạn
router.post('/request/:userId', protect, async (req, res) => {
  try {
    const receiverId = req.params.userId;

    if (receiverId === req.user._id.toString())
      return res.status(400).json({ message: 'Không thể kết bạn với chính mình' });

    // Kiểm tra đã có quan hệ chưa
    const exists = await Friendship.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id },
      ],
    });

    if (exists) {
      if (exists.status === 'accepted')
        return res.status(400).json({ message: 'Đã là bạn bè' });
      if (exists.status === 'pending')
        return res.status(400).json({ message: 'Đã gửi lời mời rồi' });
    }

    const friendship = await Friendship.create({
      sender: req.user._id,
      receiver: receiverId,
    });

    await friendship.populate('sender', 'username nickname avatar');
    await friendship.populate('receiver', 'username nickname avatar');

    res.status(201).json(friendship);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/friends/accept/:friendshipId — chấp nhận lời mời
router.put('/accept/:friendshipId', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      _id: req.params.friendshipId,
      receiver: req.user._id,
      status: 'pending',
    });

    if (!friendship)
      return res.status(404).json({ message: 'Không tìm thấy lời mời' });

    friendship.status = 'accepted';
    await friendship.save();

    // Tự động tạo phòng DM giữa 2 người
    const dmRoom = await Room.create({
      name: `dm_${friendship.sender}_${friendship.receiver}`,
      isDM: true,
      isPrivate: true,
      members: [friendship.sender, friendship.receiver],
      createdBy: req.user._id,
    });

    await friendship.populate('sender', 'username nickname avatar isOnline');
    await friendship.populate('receiver', 'username nickname avatar isOnline');

    res.json({ friendship, dmRoom });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/friends/reject/:friendshipId — từ chối lời mời
router.put('/reject/:friendshipId', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      _id: req.params.friendshipId,
      receiver: req.user._id,
      status: 'pending',
    });

    if (!friendship)
      return res.status(404).json({ message: 'Không tìm thấy lời mời' });

    res.json({ message: 'Đã từ chối lời mời kết bạn' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/friends/dm/:userId — lấy phòng DM với user
router.get('/dm/:userId', protect, async (req, res) => {
  try {
    const dmRoom = await Room.findOne({
      isDM: true,
      members: { $all: [req.user._id, req.params.userId] },
    }).populate('members', 'username nickname avatar isOnline');

    if (!dmRoom)
      return res.status(404).json({ message: 'Chưa có phòng DM' });

    res.json(dmRoom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;