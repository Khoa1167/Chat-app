import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

export default function MessageItem({ message, onReact, onReply, isDM }) {
  const { user } = useAuth();
  const isOwn = message.sender._id?.toString() === user._id?.toString();
  const senderName = message.sender.nickname || message.sender.username;

  // Trường hợp tin nhắn đã bị xóa
  if (message.isDeleted) {
    return (
      <div className={`flex flex-col mb-2 px-2 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-end gap-2">
          {!isOwn && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
          )}
          <div className={`px-3.5 py-2 text-xs italic rounded-2xl border text-gray-400 bg-gray-50 border-gray-100 ${
            isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'
          }`}>
            Tin nhắn đã bị thu hồi
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col mb-2 px-2 ${isOwn ? 'items-end' : 'items-start'}`}>
      
      {/* Nickname phía trên tin nhắn (nếu là phòng chat nhóm và không phải tin nhắn của mình) */}
      {!isOwn && !isDM && (
        <span className="text-[10px] text-gray-500 font-semibold mb-0.5 ml-10">
          {senderName}
        </span>
      )}

      {/* Reply Preview phía trên bong bóng chat */}
      {message.replyTo && (
        <div className={`flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5 mb-1 max-w-[50%] truncate ${
          isOwn ? 'mr-1' : 'ml-10'
        }`}>
          <span className="opacity-75">↩ Trả lời @{message.replyTo.sender?.nickname || message.replyTo.sender?.username}:</span>
          <span className="font-medium truncate">
            {message.replyTo.type === 'audio' ? '🎵 Tin nhắn thoại' : message.replyTo.content}
          </span>
        </div>
      )}

      {/* Hàng tin nhắn chính */}
      <div className={`flex items-end gap-2.5 max-w-full group/msg relative ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar người gửi (Chỉ hiện cho người khác) */}
        {!isOwn && (
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#0084ff] text-white flex items-center justify-center font-bold text-xs overflow-hidden ring-1 ring-gray-100" title={senderName}>
              {message.sender.avatar ? (
                <img src={message.sender.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span>{senderName[0].toUpperCase()}</span>
              )}
            </div>
          </div>
        )}

        {/* Bong bóng tin nhắn */}
        <div className="relative flex flex-col max-w-full">
          <div 
            className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
              message.type === 'audio'
                ? 'bg-transparent shadow-none'
                : isOwn 
                  ? 'bg-gradient-to-r from-[#006aff] to-[#00b2ff] text-white rounded-2xl rounded-br-[4px] px-3.5 py-2' 
                  : 'bg-[#e4e6eb] text-black rounded-2xl rounded-bl-[4px] px-3.5 py-2'
            }`}
            title={format(new Date(message.createdAt), 'HH:mm')}
          >
            {message.type === 'audio' ? (
              <audio 
                src={message.content} 
                controls 
                className={`max-w-[240px] rounded-lg p-1 ${isOwn ? 'bg-blue-50' : 'bg-gray-100'} focus:outline-none`} 
              />
            ) : (
              message.content
            )}
          </div>

          {/* Reactions hiển thị nhỏ ở dưới chân bong bóng chat */}
          {message.reactions?.length > 0 && (
            <div className={`flex gap-0.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map(r => {
                const hasReacted = r.users.some(uid => uid?.toString() === user._id?.toString());
                return (
                  <button
                    key={r.emoji}
                    className={`inline-flex items-center gap-1 border text-[10px] px-2 py-0.5 rounded-full cursor-pointer select-none active:scale-95 transition-all ${
                      hasReacted 
                        ? 'bg-blue-50 border-blue-200 text-[#0084ff]' 
                        : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => onReact(message._id, r.emoji)}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-bold opacity-85">{r.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hover Menu thao tác kiểu Messenger (Emoji + Trả lời) */}
        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 flex gap-0.5 bg-white border border-gray-200 shadow-sm p-1 rounded-full z-20 transition-opacity ${
          isOwn ? 'left-[-140px]' : 'right-[-140px]'
        }`}>
          {EMOJIS.map(emoji => (
            <button 
              key={emoji} 
              onClick={() => onReact(message._id, emoji)}
              className="w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}
          <button 
            onClick={() => onReply(message)}
            className="w-8 text-[9px] font-bold text-gray-500 hover:text-blue-500 rounded-full cursor-pointer transition-colors"
          >
            Reply
          </button>
        </div>

      </div>
    </div>
  );
}