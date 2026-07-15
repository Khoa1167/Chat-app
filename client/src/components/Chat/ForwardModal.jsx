import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ForwardModal({ isOpen, onClose, messageToForward, onForward }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [forwardedRoomIds, setForwardedRoomIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get('/rooms')
        .then(res => {
          setRooms(res.data);
          setForwardedRoomIds(new Set());
        })
        .catch(err => console.error('Lỗi khi tải danh sách phòng:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lấy tên hiển thị của phòng chat
  const getRoomName = (room) => {
    if (room.isDM) {
      const partner = room.members?.find(m => m._id?.toString() !== user._id?.toString());
      return partner?.nickname || partner?.username || 'Người dùng';
    }
    return room.name;
  };

  const filteredRooms = rooms.filter(room => {
    const name = getRoomName(room).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleForwardClick = (roomId) => {
    onForward(roomId, messageToForward);
    setForwardedRoomIds(prev => {
      const next = new Set(prev);
      next.add(roomId);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white text-black w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[450px] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b border-gray-100">
          <h3 className="font-bold text-sm text-gray-800">Chuyển tiếp tin nhắn</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-gray-50">
          <input 
            type="text" 
            placeholder="Tìm kiếm cuộc trò chuyện..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto px-4 py-1">
          {loading ? (
            <div className="flex justify-center items-center py-8 text-xs text-gray-400">
              Đang tải danh sách...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex justify-center items-center py-8 text-xs text-gray-400">
              Không tìm thấy cuộc trò chuyện nào
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredRooms.map(room => {
                const roomName = getRoomName(room);
                const hasSent = forwardedRoomIds.has(room._id);
                
                return (
                  <div key={room._id} className="flex justify-between items-center py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                        {room.isDM ? (
                          room.members?.find(m => m._id?.toString() !== user._id?.toString())?.avatar ? (
                            <img 
                              src={room.members.find(m => m._id?.toString() !== user._id?.toString()).avatar} 
                              alt="avatar" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            roomName[0].toUpperCase()
                          )
                        ) : (
                          '👥'
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold truncate text-gray-800">{roomName}</span>
                        <span className="text-[9px] text-gray-400">
                          {room.isDM ? 'Trò chuyện cá nhân' : 'Nhóm'}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleForwardClick(room._id)}
                      disabled={hasSent}
                      className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                        hasSent 
                          ? 'bg-green-50 text-green-600 cursor-default' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-95'
                      }`}
                    >
                      {hasSent ? '✓ Đã gửi' : 'Gửi'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose} 
            className="text-[10px] px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold cursor-pointer active:scale-95 transition-all"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
