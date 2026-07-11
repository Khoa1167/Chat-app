/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function FriendList({ onSelectDM }) {
  const { user } = useAuth();
  const token = sessionStorage.getItem('token');
  const { on, emit }            = useSocket(token);
  const [friends, setFriends]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQ, setSearchQ]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');

  // Load danh sách bạn bè và lời mời
  useEffect(() => {
    api.get('/friends').then(res => setFriends(res.data));
    api.get('/friends/requests').then(res => setRequests(res.data));
  }, []);

  // Lắng nghe lời mời kết bạn realtime
  useEffect(() => {
    const off = on('friend:request_received', (friendship) => {
      // friendship là object đầy đủ từ server, có _id và sender
      setRequests(prev => [...prev, friendship]);
    });
    return off;
  }, [on]);

  // Lắng nghe chấp nhận kết bạn realtime
  useEffect(() => {
    const off = on('friend:request_accepted', () => {
      api.get('/friends').then(res => setFriends(res.data));
    });
    return off;
  }, [on]);

  // Tìm kiếm user
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQ(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await api.get(`/friends/search?q=${q}`);
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Gửi lời mời kết bạn
  const sendRequest = async (userId) => {
    try {
      const { data } = await api.post(`/friends/request/${userId}`);
      // Gửi kèm toàn bộ friendship object để receiver có đủ thông tin
      emit('friend:request', { receiverId: userId, friendship: data });
      setSearchResults(prev =>
        prev.map(u => u._id === userId ? { ...u, requested: true } : u)
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi gửi lời mời');
    }
  };

  // Chấp nhận lời mời
  const acceptRequest = async (friendship) => {
    try {
      const { data } = await api.put(`/friends/accept/${friendship._id}`);
      emit('friend:accepted', {
        senderId: friendship.sender?._id || friendship.sender,
        dmRoomId: data.dmRoom._id,
      });
      setRequests(prev => prev.filter(r => r._id !== friendship._id));
      api.get('/friends').then(res => setFriends(res.data));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi chấp nhận lời mời');
    }
  };

  // Từ chối lời mời
  const rejectRequest = async (friendshipId) => {
    try {
      await api.put(`/friends/reject/${friendshipId}`);
      setRequests(prev => prev.filter(r => r._id !== friendshipId));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi từ chối lời mời');
    }
  };

  // Mở DM với bạn bè
  const openDM = async (friendId) => {
    try {
      const { data } = await api.get(`/friends/dm/${friendId}`);
      onSelectDM(data);
    } catch (err) {
      alert('Không tìm thấy phòng DM');
    }
  };

  return (
    <div className="friend-list">
      {/* Tabs */}
      <div className="friend-tabs">
        <button
          className={activeTab === 'friends' ? 'active' : ''}
          onClick={() => setActiveTab('friends')}
        >
          Bạn bè {friends.length > 0 && `(${friends.length})`}
        </button>
        <button
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Lời mời {requests.length > 0 && `(${requests.length})`}
        </button>
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          Tìm bạn
        </button>
      </div>

      {/* Tab: Danh sách bạn bè */}
      {activeTab === 'friends' && (
        <div className="friend-section">
          {friends.length === 0 && (
            <p className="no-data">Chưa có bạn bè. Tìm và kết bạn!</p>
          )}
          {friends.map(f => {
            const friend = f.sender?._id?.toString() === user?._id?.toString() ? f.receiver : f.sender;
            return (
              <div key={f._id} className="friend-item">
                <div className="friend-avatar">
                  {(friend?.nickname || friend?.username || '?')[0].toUpperCase()}
                </div>
                <div className="friend-info">
                  <span className="friend-name">
                    {friend?.nickname || friend?.username}
                  </span>
                  <span className={`friend-status ${friend?.isOnline ? 'online' : 'offline'}`}>
                    {friend?.isOnline ? '● Online' : '● Offline'}
                  </span>
                </div>
                <button className="dm-btn" onClick={() => openDM(friend?._id)}>
                  Nhắn tin
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Lời mời kết bạn */}
      {activeTab === 'requests' && (
        <div className="friend-section">
          {requests.length === 0 && (
            <p className="no-data">Không có lời mời nào</p>
          )}
          {requests.map(req => (
            <div key={req._id} className="friend-item">
              <div className="friend-avatar">
                {(req.sender?.nickname || req.sender?.username || '?')[0].toUpperCase()}
              </div>
              <div className="friend-info">
                <span className="friend-name">
                  {req.sender?.nickname || req.sender?.username}
                </span>
                <span className="friend-status">Muốn kết bạn với bạn</span>
              </div>
              <div className="request-actions">
                <button className="accept-btn" onClick={() => acceptRequest(req)}>✓</button>
                <button className="reject-btn" onClick={() => rejectRequest(req._id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Tìm kiếm */}
      {activeTab === 'search' && (
        <div className="friend-section">
          <input
            className="search-input"
            placeholder="Tìm theo tên tài khoản hoặc nickname..."
            value={searchQ}
            onChange={handleSearch}
          />
          {searchResults.length === 0 && searchQ.length >= 2 && (
            <p className="no-data">Không tìm thấy user nào</p>
          )}
          {searchResults.map(user => (
            <div key={user._id} className="friend-item">
              <div className="friend-avatar">
                {(user.nickname || user.username)[0].toUpperCase()}
              </div>
              <div className="friend-info">
                <span className="friend-name">{user.nickname || user.username}</span>
                <span className="friend-status">
                  {user.isOnline ? '● Online' : '● Offline'}
                </span>
              </div>
              <button
                className="add-btn"
                onClick={() => sendRequest(user._id)}
                disabled={user.requested}
              >
                {user.requested ? 'Đã gửi' : '+ Kết bạn'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}