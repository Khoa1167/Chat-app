const jwt        = require('jsonwebtoken');
const User       = require('../models/User');
const Message    = require('../models/Message');
const Room       = require('../models/Room');
const Friendship = require('../models/Friendship');

const setupSocket = (io) => {

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select('-password');
      if (!socket.user) return next(new Error('User not found'));
      socket.data.user = socket.user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id;
    console.log(`🟢 ${socket.user.username} connected`);

    // Đánh dấu online
    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('user:online', { userId });

    // Join tất cả room của user
    const rooms = await Room.find({ members: userId });
    rooms.forEach(r => {
      socket.join(r._id.toString());
      console.log(`🟢 ${socket.user.username} joined socket room: ${r._id}`);
    });

    // ===== EVENTS: TIN NHẮN =====

    socket.on('message:send', async ({ roomId, content, replyTo }) => {
      try {
        const room = await Room.findOne({ _id: roomId, members: userId });
        if (!room) return socket.emit('error', { message: 'Không có quyền' });

        const msg = await Message.create({
          content, sender: userId, room: roomId, replyTo: replyTo || null,
        });

        await msg.populate('sender', 'username nickname avatar');
        if (replyTo) {
          await msg.populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'username nickname avatar' }
          });
        }
        await Room.findByIdAndUpdate(roomId, { lastMessage: msg._id });

        io.to(roomId).emit('message:new', msg);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:start', {
        userId, username: socket.user.nickname || socket.user.username, roomId,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:stop', { userId, roomId });
    });

    socket.on('message:react', async ({ messageId, emoji }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const idx = msg.reactions.findIndex(r => r.emoji === emoji);
        if (idx > -1) {
          const uIdx = msg.reactions[idx].users.findIndex(u => u.toString() === userId.toString());
          if (uIdx > -1) msg.reactions[idx].users.splice(uIdx, 1);
          else msg.reactions[idx].users.push(userId);
          if (msg.reactions[idx].users.length === 0) msg.reactions.splice(idx, 1);
        } else {
          msg.reactions.push({ emoji, users: [userId] });
        }

        await msg.save();
        io.to(msg.room.toString()).emit('message:reacted', {
          messageId, reactions: msg.reactions,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete', async ({ messageId }) => {
      try {
        const msg = await Message.findOne({ _id: messageId, sender: userId });
        if (!msg) return socket.emit('error', { message: 'Không có quyền' });
        msg.isDeleted = true;
        await msg.save();
        io.to(msg.room.toString()).emit('message:deleted', { messageId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ===== EVENTS: PHÒNG CHAT =====

    socket.on('room:join', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('room:user_joined', {
        userId, username: socket.user.nickname || socket.user.username,
      });
    });

    // ===== EVENTS: KẾT BẠN =====

    // Gửi lời mời kết bạn realtime
    socket.on('friend:request', async ({ receiverId, friendship }) => {
      try {
        const receiverSockets = await io.fetchSockets();
        const receiverSocket = receiverSockets.find(
          s => s.data.user?._id.toString() === receiverId
        );

        if (receiverSocket) {
          // Forward toàn bộ friendship object để client dùng được _id
          receiverSocket.emit('friend:request_received', friendship);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Chấp nhận kết bạn → thông báo cho cả 2 và join DM room
    socket.on('friend:accepted', async ({ senderId, dmRoomId }) => {
      try {
        // Join DM room
        socket.join(dmRoomId);

        // Tìm socket của sender và thông báo
        const allSockets = await io.fetchSockets();
        const senderSocket = allSockets.find(
          s => s.data.user?._id.toString() === senderId
        );

        if (senderSocket) {
          senderSocket.join(dmRoomId);
          senderSocket.emit('friend:request_accepted', {
            receiverId: userId,
            receiverNickname: socket.user.nickname || socket.user.username,
            dmRoomId,
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ===== DISCONNECT =====

    socket.on('disconnect', async () => {
      const activeSockets = await io.fetchSockets();
      const hasOtherConnections = activeSockets.some(
        s => s.data.user?._id.toString() === userId.toString()
      );

      if (!hasOtherConnections) {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.broadcast.emit('user:offline', { userId });
        console.log(`🔴 ${socket.user.username} disconnected`);
      } else {
        console.log(`🟡 ${socket.user.username} disconnected one of their connections`);
      }
    });
  });
};

module.exports = setupSocket;