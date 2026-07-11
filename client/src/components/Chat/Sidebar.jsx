import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import ProfileModal from '../Profile/ProfileModal';

// Lấy thông tin người đang chat cùng trong phòng DM
const getDMPartner = (room, currentUser) => {
  if (!room?.isDM || !room?.members) return null;
  return room.members.find(m => m._id?.toString() !== currentUser._id?.toString());
};

export default function Sidebar({ activeRoom, onSelectRoom }) {
  const { user, logout }    = useAuth();
  const token = sessionStorage.getItem('token');
  const { on, emit }        = useSocket(token);
  const [rooms, setRooms]   = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  // Load danh sách phòng của user
  useEffect(() => {
    api.get('/rooms').then(res => setRooms(res.data));
  }, []);

  // Lắng nghe khi được thêm vào phòng mới
  useEffect(() => {
    const off = on('room:added', (room) => {
      setRooms(prev => {
        const exists = prev.find(r => r._id === room._id);
        if (exists) return prev;
        return [room, ...prev];
      });
    });
    return off;
  }, [on]);

    // Cập nhật trạng thái online
  useEffect(() => {
    const off = on('user:online', ({ userId }) => {
      setRooms(prev => prev.map(r => ({
        ...r,
        members: r.members?.map(m =>
          m._id?.toString() === userId?.toString()
            ? { ...m, isOnline: true }
            : m
        )
      })));
    });
    return off;
  }, [on]);

  // Cập nhật trạng thái offline
  useEffect(() => {
    const off = on('user:offline', ({ userId }) => {
      setRooms(prev => prev.map(r => ({
        ...r,
        members: r.members?.map(m =>
          m._id?.toString() === userId?.toString()
            ? { ...m, isOnline: false }
            : m
        )
      })));
    });
    return off;
  }, [on]);

  // Cập nhật tin nhắn cuối khi có tin nhắn mới
  useEffect(() => {
    const off = on('message:new', (msg) => {
      setRooms(prev =>
        prev.map(r => r._id === msg.room
          ? { ...r, lastMessage: msg, updatedAt: msg.createdAt }
          : r
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    });
    return off;
  }, [on]);

  // Tạo phòng mới
  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const { data } = await api.post('/rooms', { name: newRoomName });
      setRooms(prev => [data, ...prev]);
      setNewRoomName('');
      setShowCreate(false);
      onSelectRoom(data);
      emit('room:join', data._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Tạo phòng thất bại');
    }
  };

  // Hiển thị danh sách tất cả phòng để tham gia
  const handleShowJoin = async () => {
    try {
      const { data } = await api.get('/rooms/all');
      setAllRooms(data);
      setShowJoin(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Tham gia phòng
  const joinRoom = async (room) => {
    try {
      const { data } = await api.post(`/rooms/${room._id}/join`);
      setRooms(prev => {
        const exists = prev.find(r => r._id === data._id);
        if (exists) return prev;
        return [data, ...prev];
      });
      setShowJoin(false);
      onSelectRoom(data);
      emit('room:join', data._id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="user-info" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
          {user.avatar ? (
            <img src={user.avatar} alt="avatar" className="avatar-img" />
          ) : (
            <div className="avatar">{(user.nickname || user.username)[0].toUpperCase()}</div>
          )}
          <span>{user.nickname || user.username}</span>
        </div>
        <button onClick={logout} className="logout-btn" title="Đăng xuất">⏻</button>
      </div>

  {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Danh sách phòng */}
      <div className="sidebar-section">
        <div className="section-header">
          <span>Cuộc trò chuyện</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleShowJoin} title="Tìm phòng">🔍</button>
            <button onClick={() => setShowCreate(!showCreate)} title="Tạo phòng">+</button>
          </div>
        </div>

        {/* Form tạo phòng */}
        {showCreate && (
          <form onSubmit={createRoom} className="create-room-form">
            <input
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              placeholder="Tên phòng..."
              autoFocus
            />
            <button type="submit">Tạo</button>
          </form>
        )}

        {/* Danh sách phòng để tham gia */}
        {showJoin && (
          <div className="join-room-list">
            <div className="join-room-header">
              <span>Tìm phòng để tham gia</span>
              <button onClick={() => setShowJoin(false)}>✕</button>
            </div>
            {allRooms.length === 0 && (
              <p className="no-rooms">Không có phòng nào</p>
            )}
            {allRooms.filter(r => !r.isDM).map(room => {
              const isMember = rooms.find(r => r._id === room._id);
              return (
                <div key={room._id} className="join-room-item">
                  <span>#{room.name}</span>
                  {isMember
                    ? <span className="joined-tag">Đã tham gia</span>
                    : <button onClick={() => joinRoom(room)}>Tham gia</button>
                  }
                </div>
              );
            })}
          </div>
        )}

        {/* Danh sách phòng của user — kiểu Discord/Messenger */}
        <div className="room-list">
          {rooms.length === 0 && (
            <p className="no-rooms">Chưa có cuộc trò chuyện nào.<br/>Tạo phòng hoặc kết bạn để bắt đầu!</p>
          )}
          {rooms.map(room => {
            const dmPartner = getDMPartner(room, user);
            const displayName = room.isDM
              ? (dmPartner?.nickname || dmPartner?.username || 'Unknown')
              : room.name;
            const lastMsgText = room.lastMessage?.content
              ? (room.lastMessage.content.length > 28
                  ? room.lastMessage.content.slice(0, 28) + '...'
                  : room.lastMessage.content)
              : (room.isDM ? 'Bắt đầu trò chuyện' : 'Chưa có tin nhắn');

            return (
              <div
                key={room._id}
                className={`room-item-card ${activeRoom?._id === room._id ? 'active' : ''}`}
                onClick={() => onSelectRoom(room)}
              >
                {room.isDM ? (
                  <div className="room-avatar dm-avatar">
                    {displayName[0].toUpperCase()}
                    {dmPartner?.isOnline && <span className="online-badge" />}
                  </div>
                ) : (
                  <div className="room-avatar group-avatar">#</div>
                )}
                <div className="room-text">
                  <div className="room-name-row">{displayName}</div>
                  <div className="room-preview">{lastMsgText}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
