import { useState } from 'react';
import Sidebar    from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import FriendList from '../components/Chat/FriendList';

export default function ChatPage() {
  const [activeRoom, setActiveRoom] = useState(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-black font-sans select-none">
      {/* Cột 1: Sidebar (Danh sách cuộc trò chuyện) — màu nền trắng, rộng 360px */}
      <div className="w-[360px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
        <Sidebar activeRoom={activeRoom} onSelectRoom={setActiveRoom} />
      </div>

      {/* Cột 2: Vùng nội dung chính (Khung chat hoặc Danh sách bạn bè) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeRoom ? (
          <ChatWindow key={activeRoom._id} room={activeRoom} onBackToFriends={() => setActiveRoom(null)} />
        ) : (
          <FriendList onSelectDM={setActiveRoom} />
        )}
      </div>
    </div>
  );
}