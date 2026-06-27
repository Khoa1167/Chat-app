import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import api from '../../services/api';

// Lấy thông tin người đang chat cùng trong phòng DM
const getDMPartner = (room, currentUser) => {
  if (!room?.isDM || !room?.members) return null;
  return room.members.find(m => m._id?.toString() !== currentUser._id?.toString());
};

export default function ChatWindow({ room }) {
  const { user }          = useAuth();
  const token             = sessionStorage.getItem('token');
  const { emit, on }      = useSocket(token);
  const [messages, setMessages]       = useState([]);
  const [typing, setTyping]           = useState([]);
  const [replyTo, setReplyTo]         = useState(null);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [dmPartnerOnline, setDmPartnerOnline] = useState(false);
  const bottomRef = useRef(null);

  // Khởi tạo trạng thái online của DM partner
  useEffect(() => {
    const partner = getDMPartner(room, user);
    setDmPartnerOnline(partner?.isOnline || false);
  }, [room?._id]);

  // Load tin nhắn khi chọn phòng mới
  useEffect(() => {
    if (!room) return;
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setReplyTo(null);

    api.get(`/rooms/${room._id}/messages?page=1&limit=30`)
      .then(res => {
        setMessages(res.data);
        setHasMore(res.data.length === 30);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
      });
  }, [room?._id]);

  // Lắng nghe các sự kiện WebSocket
  useEffect(() => {
    if (!room) return;

    emit('room:join', room._id);

    // Nhận tin nhắn mới
    const offNew = on('message:new', (msg) => {
      if (msg.room === room._id) {
        setMessages(prev => [...prev, msg]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Tin nhắn bị xóa
    const offDeleted = on('message:deleted', ({ messageId }) => {
      setMessages(prev =>
        prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m)
      );
    });

    // Tin nhắn được react
    const offReacted = on('message:reacted', ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => m._id === messageId ? { ...m, reactions } : m)
      );
    });

    // Typing indicator
    const offTypingStart = on('typing:start', ({ userId: uid, username, roomId }) => {
      if (roomId === room._id && uid !== user._id) {
        setTyping(prev => prev.includes(username) ? prev : [...prev, username]);
      }
    });
    const offTypingStop = on('typing:stop', ({ roomId }) => {
      if (roomId === room._id) setTyping([]);
    });

    // Trạng thái online/offline của DM partner
    const partner = getDMPartner(room, user);
    const offOnline = on('user:online', ({ userId }) => {
      if (userId?.toString() === partner?._id?.toString()) {
        setDmPartnerOnline(true);
      }
    });
    const offOffline = on('user:offline', ({ userId }) => {
      if (userId?.toString() === partner?._id?.toString()) {
        setDmPartnerOnline(false);
      }
    });

    return () => {
      offNew(); offDeleted(); offReacted();
      offTypingStart(); offTypingStop();
      offOnline(); offOffline();
    };
  }, [room?._id, on, emit, user._id]);

  const handleSend = useCallback((content, replyToId) => {
    emit('message:send', { roomId: room._id, content, replyTo: replyToId });
    setReplyTo(null);
  }, [emit, room?._id]);

  const handleTyping = useCallback((isTyping) => {
    emit(isTyping ? 'typing:start' : 'typing:stop', { roomId: room._id });
  }, [emit, room?._id]);

  const handleReact = useCallback((messageId, emoji) => {
    emit('message:react', { messageId, emoji });
  }, [emit]);

  const loadMore = async () => {
    const nextPage = page + 1;
    const res = await api.get(`/rooms/${room._id}/messages?page=${nextPage}&limit=30`);
    setMessages(prev => [...res.data, ...prev]);
    setPage(nextPage);
    setHasMore(res.data.length === 30);
  };

  if (!room) {
    return (
      <div className="no-room">
        <p>👈 Chọn một phòng để bắt đầu chat</p>
      </div>
    );
  }

  const dmPartner = getDMPartner(room, user);

  return (
    <div className="chat-window">
      {/* Header phòng chat */}
      <div className="chat-header">
        {room.isDM ? (
          <>
            <div className="avatar dm-header-avatar">
              {(dmPartner?.nickname || dmPartner?.username || '?')[0].toUpperCase()}
            </div>
            <div className="dm-header-info">
              <h3>{dmPartner?.nickname || dmPartner?.username || 'Unknown'}</h3>
              <span className={dmPartnerOnline ? 'status-online' : 'status-offline'}>
                {dmPartnerOnline ? '● Đang hoạt động' : '● Ngoại tuyến'}
              </span>
            </div>
          </>
        ) : (
          <>
            <h3>#{room.name}</h3>
            <span>{room.members?.length} thành viên</span>
          </>
        )}
      </div>

      {/* Danh sách tin nhắn */}
      <div className="messages-container">
        {hasMore && (
          <button className="load-more" onClick={loadMore}>
            Tải thêm tin nhắn cũ
          </button>
        )}
        {messages.map(msg => (
          <MessageItem
            key={msg._id}
            message={msg}
            onReact={handleReact}
            onReply={setReplyTo}
          />
        ))}
        {typing.length > 0 && (
          <p className="typing-indicator">
            {typing.join(', ')} đang nhập...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ô nhập tin nhắn */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}