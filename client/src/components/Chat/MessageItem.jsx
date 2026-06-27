import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

export default function MessageItem({ message, onReact, onReply }) {
  const { user } = useAuth();
  const isOwn = message.sender._id?.toString() === user._id?.toString();

  if (message.isDeleted) {
    return (
      <div className={`message-item ${isOwn ? 'own' : ''}`}>
        <p className="message-deleted">Tin nhắn đã bị xóa</p>
      </div>
    );
  }

  return (
    <div className={`message-item ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <div className="avatar">
          {(message.sender.nickname || message.sender.username)[0].toUpperCase()}
        </div>
      )}
      <div className="message-body">
        {!isOwn && (
          <span className="message-sender">{message.sender.nickname || message.sender.username}</span>
        )}
        {message.replyTo && (
          <div className="reply-preview">
            <span>{message.replyTo.sender?.username}: </span>
            {message.replyTo.content}
          </div>
        )}
        <div className="message-bubble">
          <p>{message.content}</p>
          <span className="message-time">
            {format(new Date(message.createdAt), 'HH:mm')}
            {message.isEdited && ' (đã sửa)'}
          </span>
        </div>
        {message.reactions?.length > 0 && (
          <div className="reactions">
            {message.reactions.map(r => (
              <button
                key={r.emoji}
                className="reaction-btn"
                onClick={() => onReact(message._id, r.emoji)}
              >
                {r.emoji} {r.users.length}
              </button>
            ))}
          </div>
        )}
        <div className="message-actions">
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => onReact(message._id, emoji)}>
              {emoji}
            </button>
          ))}
          <button onClick={() => onReply(message)}>Trả lời</button>
        </div>
      </div>
    </div>
  );
}