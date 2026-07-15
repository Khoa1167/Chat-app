import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

export default function MessageItem({ message, onReact, onReply, isDM }) {
  const { user } = useAuth();
  const isOwn = message.sender._id?.toString() === user._id?.toString();
  const senderName = message.sender.nickname || message.sender.username;

  // Cuộn mượt đến vị trí tin nhắn gốc được trả lời kèm hiệu ứng chớp tắt highlight
  const handleScrollToOriginal = () => {
    if (!message.replyTo?._id) return;
    const target = document.getElementById(`msg-${message.replyTo._id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('bg-blue-50/50', 'ring-2', 'ring-blue-100', 'p-1');
      setTimeout(() => {
        target.classList.remove('bg-blue-50/50', 'ring-2', 'ring-blue-100', 'p-1');
      }, 1500);
    }
  };

  // Trường hợp tin nhắn đã bị xóa
  if (message.isDeleted) {
    return (
      <div id={`msg-${message._id}`} className={`flex flex-col mb-2 px-2 transition-all duration-300 rounded-lg ${isOwn ? 'items-end' : 'items-start'}`}>
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
    <div id={`msg-${message._id}`} className={`flex flex-col mb-2 px-2 transition-all duration-300 rounded-lg ${isOwn ? 'items-end' : 'items-start'}`}>
      
      {/* Nickname phía trên tin nhắn (nếu là phòng chat nhóm và không phải tin nhắn của mình) */}
      {!isOwn && !isDM && (
        <span className="text-[10px] text-gray-500 font-semibold mb-0.5 ml-10">
          {senderName}
        </span>
      )}

      {/* Discord-style Reply Preview */}
      {message.replyTo && (
        <div 
          onClick={handleScrollToOriginal}
          className={`flex items-center text-[11px] text-gray-500 mb-1 select-none cursor-pointer hover:opacity-85 transition-opacity ${
            isOwn ? 'flex-row-reverse mr-2' : 'ml-4'
          }`}
          title="Cuộn tới tin nhắn gốc"
        >
          {/* Connector Line */}
          <div className={`w-6 h-3 border-t-2 border-gray-200 flex-shrink-0 ${
            isOwn 
              ? 'border-r-2 rounded-tr-md ml-1.5' 
              : 'border-l-2 rounded-tl-md mr-1.5'
          }`} style={{ marginTop: '6px' }} />
          
          {/* Mini Avatar */}
          <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 mr-1.5">
            {message.replyTo.sender?.avatar ? (
              <img src={message.replyTo.sender.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-400 text-[8px] text-white flex items-center justify-center font-bold">
                {(message.replyTo.sender?.nickname || message.replyTo.sender?.username || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Replying target name */}
          <span className="font-bold text-gray-600 mr-1.5 hover:underline">
            @{message.replyTo.sender?.nickname || message.replyTo.sender?.username}
          </span>

          {/* Snippet of content (optimized và ẩn Cloudinary URL) */}
          <span className="text-gray-400 truncate max-w-[200px] italic">
            {message.replyTo.type === 'audio' ? 'Tin nhắn thoại' : 
             message.replyTo.type === 'image' ? '[Hình ảnh]' : 
             message.replyTo.type === 'file' ? `[Tệp: ${message.replyTo.fileName || 'Tài liệu'}]` : 
             message.replyTo.content}
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
              message.type === 'audio' || message.type === 'image' || message.type === 'file'
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
            ) : message.type === 'image' ? (
              <img 
                src={message.content} 
                alt="Hình ảnh đính kèm" 
                className="max-w-[240px] max-h-[240px] rounded-2xl cursor-pointer object-cover border border-gray-100 shadow-xs hover:opacity-90 transition-opacity" 
                onClick={() => window.open(message.content, '_blank')} 
              />
            ) : message.type === 'file' ? (
              <div className={`flex items-center gap-3 rounded-2xl p-3.5 max-w-[240px] border shadow-3xs ${
                isOwn 
                  ? 'bg-[#0084ff] border-[#007be6] text-white' 
                  : 'bg-[#f0f2f5] border-gray-200 text-black'
              }`}>
                <span className="text-2xl select-none">📄</span>
                <div className="flex flex-col min-w-0">
                  <a 
                    href={message.content} 
                    download 
                    target="_blank" 
                    rel="noreferrer" 
                    className={`text-[13px] font-semibold truncate hover:underline cursor-pointer ${
                      isOwn ? 'text-white' : 'text-[#0084ff]'
                    }`}
                    title={message.fileName || 'Tải file'}
                  >
                    {message.fileName || 'Tệp đính kèm'}
                  </a>
                  <span className={`text-[10px] font-medium mt-0.5 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                    Tệp đính kèm
                  </span>
                </div>
              </div>
            ) : (
              message.content
            )}
          </div>

          {/* Reactions hiển thị nhỏ ở dưới chân bong bóng chat */}
          {message.reactions?.length > 0 && (
            <div className={`flex gap-0.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map(r => {
                const hasReacted = r.users.some(u => {
                  const uid = typeof u === 'object' && u !== null ? u._id : u;
                  return uid?.toString() === user._id?.toString();
                });
                
                const reactorNames = r.users
                  .map(u => (typeof u === 'object' && u !== null ? (u.nickname || u.username) : 'Người dùng'))
                  .join(', ');

                return (
                  <div key={r.emoji} className="relative group/react inline-block">
                    <button
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
                    
                    {/* Tooltip hiển thị người bày tỏ cảm xúc */}
                    {reactorNames && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/react:flex flex-col items-center z-30">
                        <div className="bg-gray-900/95 text-white text-[9px] font-semibold px-2 py-1 rounded-md shadow-md whitespace-nowrap leading-tight text-center">
                          {reactorNames}
                        </div>
                        <div className="w-1.5 h-1.5 bg-gray-900/95 rotate-45 -mt-0.5" />
                      </div>
                    )}
                  </div>
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