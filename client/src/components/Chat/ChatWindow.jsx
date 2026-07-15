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

export default function ChatWindow({ room, onBackToFriends }) {
  const { user }          = useAuth();
  const { emit, on, isConnected } = useSocket();
  const [messages, setMessages]       = useState([]);
  const [typing, setTyping]           = useState([]);
  const [replyTo, setReplyTo]         = useState(null);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [dmPartnerOnline, setDmPartnerOnline] = useState(
    () => getDMPartner(room, user)?.isOnline || false
  );
  const [showMembers, setShowMembers] = useState(true);
  const bottomRef = useRef(null);

  // Load tin nhắn khi chọn phòng mới
  useEffect(() => {
    if (!room) return;

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
      if (msg.room?.toString() === room._id?.toString()) {
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
  }, [room?._id, user?._id, on, emit, isConnected]);

  const roomId = room?._id;

  const handleSend = useCallback((content, replyToId) => {
    emit('message:send', { roomId, content, replyTo: replyToId });
    setReplyTo(null);
  }, [emit, roomId]);

  const handleTyping = useCallback((isTyping) => {
    emit(isTyping ? 'typing:start' : 'typing:stop', { roomId });
  }, [emit, roomId]);

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
      <div className="flex-1 flex flex-col items-center justify-center bg-white text-gray-500 p-8 select-none">
        <span className="text-6xl mb-4 opacity-30">💬</span>
        <p className="text-lg font-bold text-gray-800">Chào mừng bạn đến với Chat App!</p>
        <p className="text-sm opacity-70 mt-1">Chọn một phòng chat hoặc Bạn bè ở sidebar để bắt đầu trò chuyện.</p>
      </div>
    );
  }

  const dmPartner = getDMPartner(room, user);
  const displayName = room.isDM
    ? (dmPartner?.nickname || dmPartner?.username || 'Người dùng Messenger')
    : room.name;

  const onlineMembers = !room.isDM ? (room.members?.filter(m => m.isOnline) || []) : [];
  const offlineMembers = !room.isDM ? (room.members?.filter(m => !m.isOnline) || []) : [];

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden bg-white text-black">
      {/* Vùng chat chính (giữa) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-white">
        
        {/* Header phòng chat — màu trắng Messenger */}
        <div className="h-[60px] border-b border-gray-200 px-4 flex items-center justify-between bg-white flex-shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Nút quay lại Bạn bè */}
            <button 
              onClick={onBackToFriends}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors text-base font-bold text-gray-600"
              title="Quay lại danh sách bạn bè"
            >
              ←
            </button>

            {/* Avatar Header */}
            <div className="relative">
              {room.isDM ? (
                <div className="w-10 h-10 rounded-full bg-gray-200 text-white flex items-center justify-center font-bold text-sm overflow-hidden ring-1 ring-gray-100">
                  {dmPartner?.avatar ? (
                    <img src={dmPartner.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#0084ff] flex items-center justify-center text-white">
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#006aff] to-[#00b2ff] text-white flex items-center justify-center font-bold text-base">
                  💬
                </div>
              )}
              {room.isDM && (
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  dmPartnerOnline ? 'bg-[#31a24c]' : 'bg-gray-400'
                }`} />
              )}
            </div>

            <div className="flex flex-col leading-tight">
              <span className="font-bold text-gray-900 truncate text-[15px]">{displayName}</span>
              <span className="text-[11px] text-gray-500 font-medium">
                {room.isDM 
                  ? (dmPartnerOnline ? 'Đang hoạt động' : 'Không hoạt động') 
                  : `${room.members?.length || 0} thành viên`
                }
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Các icon cuộc gọi mock kiểu Messenger */}
            <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors text-base cursor-pointer">📞</button>
            <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors text-base cursor-pointer">📹</button>
            
            {/* Nút bật/tắt Info Sidebar */}
            <button 
              onClick={() => setShowMembers(!showMembers)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-base cursor-pointer transition-colors ${showMembers ? 'bg-blue-50 text-[#0084ff]' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Thông tin cuộc trò chuyện"
            >
              ℹ️
            </button>
          </div>
        </div>

        {/* Danh sách tin nhắn */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 hide-scrollbar bg-white">
          {hasMore && (
            <button className="bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors self-center mb-4 text-xs font-semibold py-1.5 px-4 rounded-full shadow-xs cursor-pointer active:scale-95" onClick={loadMore}>
              Xem tin nhắn cũ hơn
            </button>
          )}
          
          <div className="flex flex-col gap-1.5">
            {messages.map((msg) => {
              // Messenger không sử dụng cơ chế gộp kiểu timeline Discord, mà dùng bong bóng liên tiếp.
              // Chúng ta truyền isGrouped = false để hiển thị đầy đủ avatar của các tin nhắn khác nhau.
              return (
                <MessageItem
                  key={msg._id}
                  message={msg}
                  onReact={handleReact}
                  onReply={setReplyTo}
                  isGrouped={false}
                  isDM={room.isDM}
                />
              );
            })}
          </div>
          
          {typing.length > 0 && (
            <p className="text-[11px] text-gray-400 italic mt-1 px-4">
              💬 {typing.join(', ')} đang nhập...
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Ô nhập tin nhắn */}
        <div className="flex-shrink-0">
          <MessageInput
            onSend={handleSend}
            onTyping={handleTyping}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      </div>

      {/* Cột 4: Thông tin cuộc trò chuyện bên phải (Messenger Details Sidebar) */}
      {showMembers && (
        <div className="w-[300px] bg-white flex flex-col border-l border-gray-200 flex-shrink-0">
          <div className="h-[60px] border-b border-gray-200 px-4 flex items-center bg-white font-bold text-gray-800 select-none flex-shrink-0 text-sm">
            Thông tin chi tiết
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar p-4 flex flex-col items-center gap-6">
            {/* Ảnh đại diện phòng lớn ở cột thông tin */}
            <div className="flex flex-col items-center gap-2 mt-4 text-center">
              {room.isDM ? (
                <div className="w-20 h-20 rounded-full bg-gray-200 text-white flex items-center justify-center font-bold text-3xl overflow-hidden ring-2 ring-gray-100">
                  {dmPartner?.avatar ? (
                    <img src={dmPartner.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#0084ff] flex items-center justify-center text-white">
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#006aff] to-[#00b2ff] text-white flex items-center justify-center font-bold text-4xl">
                  💬
                </div>
              )}
              <span className="font-bold text-lg text-gray-900 mt-2">{displayName}</span>
              {room.isDM && (
                <span className="text-xs text-gray-500">
                  {dmPartnerOnline ? 'Đang hoạt động trên Messenger' : 'Không hoạt động'}
                </span>
              )}
            </div>

            <div className="w-full h-[1px] bg-gray-100" />

            {/* Mục thành viên (Nếu không phải DM) */}
            {!room.isDM && (
              <div className="w-full flex flex-col gap-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                  Thành viên nhóm ({room.members?.length || 0})
                </h4>

                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto hide-scrollbar">
                  {/* Trực tuyến */}
                  {onlineMembers.map(m => (
                    <div key={m._id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-[#0084ff] text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                            {m.avatar ? (
                              <img src={m.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <span>{(m.nickname || m.username)[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#31a24c]" />
                        </div>
                        <span className="text-sm font-semibold truncate text-gray-800">{m.nickname || m.username}</span>
                      </div>
                    </div>
                  ))}

                  {/* Ngoại tuyến */}
                  {offlineMembers.map(m => (
                    <div key={m._id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors opacity-70">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold text-sm overflow-hidden">
                            {m.avatar ? (
                              <img src={m.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover filter grayscale" />
                            ) : (
                              <span>{(m.nickname || m.username)[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-gray-400" />
                        </div>
                        <span className="text-sm font-semibold truncate text-gray-700">{m.nickname || m.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}