import { useState, useRef } from 'react';

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply }) {
  const [content, setContent]   = useState('');
  const typingTimeout           = useRef(null);

  const handleChange = (e) => {
    setContent(e.target.value);
    onTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSend(content.trim(), replyTo?._id);
    setContent('');
    onTyping(false);
    clearTimeout(typingTimeout.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="px-4 py-3 bg-white flex flex-col gap-1 border-t border-gray-100">
      {replyTo && (
        <div className="flex justify-between items-center bg-[#f0f2f5] border-l-2 border-[#0084ff] rounded-lg px-3.5 py-1.5 text-xs text-gray-700 shadow-xs mb-1">
          <span>
            ↩ Đang trả lời <strong className="font-bold text-[#0084ff]">@{replyTo.sender.nickname || replyTo.sender.username}</strong>
          </span>
          <button onClick={onCancelReply} className="hover:text-black text-[10px] cursor-pointer font-bold px-2 py-0.5 rounded bg-gray-200">✕ Hủy</button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center bg-[#f0f2f5] rounded-full px-4 py-2">
        {/* Nút cộng đính kèm (Attachment Mock) */}
        <button 
          type="button"
          className="text-[#0084ff] hover:text-[#006aff] font-black cursor-pointer text-base mr-3 transition-colors select-none"
        >
          ➕
        </button>

        <input
          className="bg-transparent border-none text-black placeholder-gray-500 text-sm focus:outline-none flex-1 w-full"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn... (Nhấn Enter để gửi)"
          autoFocus
        />

        {/* Nút gửi tin nhắn */}
        <button
          type="submit"
          className={`ml-2 text-sm font-bold cursor-pointer transition-colors ${
            content.trim() ? 'text-[#0084ff] hover:text-[#006aff]' : 'text-gray-400 cursor-not-allowed'
          }`}
          disabled={!content.trim()}
        >
          Gửi
        </button>
      </form>
    </div>
  );
}