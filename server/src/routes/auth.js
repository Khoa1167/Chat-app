const router      = require('express').Router();
const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcryptjs');
const User        = require('../models/User');
const PendingUser = require('../models/PendingUser');
const { protect } = require('../middleware/auth');
const { sendOTPEmail } = require('../config/mailer');

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Tạo OTP 6 số ngẫu nhiên
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─── POST /api/auth/send-otp ───────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { username, password, email, phone } = req.body;

    // Validate cơ bản
    if (!username || !password || !email)
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    if (username.length < 3)
      return res.status(400).json({ message: 'Tên tài khoản phải có ít nhất 3 ký tự' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });

    // Kiểm tra username/email đã tồn tại chưa
    const usernameExists = await User.findOne({ username });
    if (usernameExists)
      return res.status(400).json({ message: 'Tên tài khoản đã tồn tại' });

    const emailExists = await User.findOne({ email });
    if (emailExists)
      return res.status(400).json({ message: 'Email đã được sử dụng' });

    // Tạo OTP và hash password
    const otp          = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 12);
    const expiresAt    = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Xóa pending user cũ nếu có, tạo mới hoàn toàn
    await PendingUser.deleteOne({ email });
    await PendingUser.create({
      username, hashedPassword, email,
      phone: phone || '', otp, expiresAt, attempts: 0,
    });

    // Gửi email OTP
    await sendOTPEmail(email, otp);

    res.json({ message: 'OTP đã được gửi tới email của bạn' });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ message: 'Lỗi gửi OTP, vui lòng thử lại' });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: 'Thiếu email hoặc OTP' });

    const pending = await PendingUser.findOne({ email });
    if (!pending)
      return res.status(400).json({ message: 'Không tìm thấy yêu cầu đăng ký' });

    // Kiểm tra hết hạn
    if (new Date() > pending.expiresAt) {
      await PendingUser.deleteOne({ email });
      return res.status(400).json({ message: 'OTP đã hết hạn, vui lòng đăng ký lại' });
    }

    // Kiểm tra số lần nhập sai
    if (pending.attempts >= 5) {
      await PendingUser.deleteOne({ email });
      return res.status(400).json({ message: 'Quá nhiều lần nhập sai, vui lòng đăng ký lại' });
    }

    // Kiểm tra OTP đúng không
    if (pending.otp !== otp) {
      pending.attempts += 1;
      await pending.save();
      const remaining = 5 - pending.attempts;
      return res.status(400).json({
        message: `OTP không đúng, còn ${remaining} lần thử`
      });
    }

    // OTP đúng → tạo tài khoản thật
    const user = new User({
      username: pending.username,
      email:    pending.email,
      phone:    pending.phone,
      nickname: `user_${Date.now()}`,
      password: pending.hashedPassword,
    });
    // Đánh dấu password chưa bị thay đổi để bypass pre-save hook
    user.$__.activePaths.states.modify = {};
    await user.save({ validateBeforeSave: false });

    // Xóa pending user
    await PendingUser.deleteOne({ email });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token: genToken(user._id),
      user,
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/check-username ────────────────────────────────────────
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    const exists = await User.findOne({ username });
    res.json({ available: !exists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/check-nickname ────────────────────────────────────────
router.post('/check-nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    const exists = await User.findOne({ nickname });
    res.json({ available: !exists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/set-nickname ──────────────────────────────────────────
router.post('/set-nickname', protect, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.trim().length < 2)
      return res.status(400).json({ message: 'Nickname phải có ít nhất 2 ký tự' });

    const exists = await User.findOne({
      nickname, _id: { $ne: req.user._id }
    });
    if (exists)
      return res.status(400).json({ message: 'Tên hiển thị đã tồn tại' });

    const user = await User.findByIdAndUpdate(
      req.user._id, { nickname }, { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Sai tên tài khoản hoặc mật khẩu' });

    res.json({ token: genToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => res.json(req.user));

module.exports = router;