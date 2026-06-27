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
    <div className="message-input-container">
      {replyTo && (
        <div className="reply-bar">
          <span>
            Trả lời <strong>{replyTo.sender.username}</strong>: {replyTo.content}
          </span>
          <button onClick={onCancelReply}>✕</button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="message-form">
        <input
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn... (Enter để gửi)"
          autoFocus
        />
        <button type="submit" disabled={!content.trim()}>
          Gửi
        </button>
      </form>
    </div>
  );
}