import { useState } from 'react';
import Sidebar    from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import FriendList from '../components/Chat/FriendList';

export default function ChatPage() {
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeTab, setActiveTab]   = useState('rooms');

  return (
    <div className="chat-layout">
      {/* Cột trái — navigation icons */}
      <div className="nav-bar">
        <button
          className={`nav-icon ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
          title="Phòng chat"
        >
          💬
        </button>
        <button
          className={`nav-icon ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
          title="Bạn bè"
        >
          👥
        </button>
      </div>

      {/* Cột sidebar */}
      <div className="sidebar-wrapper">
        {activeTab === 'rooms' && (
          <Sidebar activeRoom={activeRoom} onSelectRoom={setActiveRoom} />
        )}
        {activeTab === 'friends' && (
          <FriendList onSelectDM={(room) => {
            setActiveRoom(room);
            setActiveTab('rooms');
          }} />
        )}
      </div>

      {/* Thêm key={activeRoom?._id} để React tự reset state khi đổi phòng */}
      <ChatWindow key={activeRoom?._id} room={activeRoom} />
    </div>
  );
}