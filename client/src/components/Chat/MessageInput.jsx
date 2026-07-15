import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply }) {
  const [content, setContent]   = useState('');
  const typingTimeout           = useRef(null);

  // States cho tính năng ghi âm
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

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

  // Bắt đầu ghi âm
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(10); // Lấy data mỗi 10ms

      setIsRecording(true);
      setRecordingTime(0);

      // Bắt đầu bộ đếm thời gian
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Không thể truy cập Microphone:', err);
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền thiết bị.');
    }
  };

  // Hủy ghi âm
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      // Dừng track âm thanh để tắt mic của thiết bị
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // Hoàn tất ghi âm và gửi đi
  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    
    recorder.onstop = async () => {
      try {
        setIsUploading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Tạo FormData để upload file
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-message.webm');

        // Gửi API upload lên server -> Cloudinary
        const res = await api.post('/rooms/upload-audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const audioUrl = res.data.url;

        // Gọi hàm onSend với type là 'audio'
        onSend(audioUrl, replyTo?._id, 'audio');

      } catch (err) {
        console.error('Lỗi khi tải tệp âm thanh lên:', err);
        alert('Gửi tin nhắn thoại thất bại. Vui lòng thử lại.');
      } finally {
        setIsUploading(false);
      }
    };

    // Dừng recorder (kích hoạt sự kiện onstop)
    recorder.stop();
    // Dừng track âm thanh để tắt mic
    recorder.stream.getTracks().forEach(track => track.stop());
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Định dạng thời gian mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dọn dẹp bộ đếm khi unmount component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

      {isRecording ? (
        // Giao diện khi đang ghi âm
        <div className="flex items-center justify-between bg-[#ffebee] border border-[#ffcdd2] rounded-full px-4 py-2 text-red-600 font-semibold animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="text-sm">Đang ghi âm...</span>
            <span className="ml-2 font-mono text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-md">{formatTime(recordingTime)}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút hủy ghi âm */}
            <button 
              type="button"
              onClick={cancelRecording}
              className="text-gray-500 hover:text-red-600 text-sm cursor-pointer select-none font-bold bg-white hover:bg-red-50 border border-gray-200 px-3 py-1 rounded-full shadow-2xs transition-colors"
              title="Hủy ghi âm"
            >
              🗑️ Hủy
            </button>

            {/* Nút gửi ghi âm */}
            <button 
              type="button"
              onClick={stopAndSendRecording}
              className="bg-red-600 hover:bg-red-700 text-white text-sm cursor-pointer select-none font-bold px-4 py-1 rounded-full shadow-sm active:scale-95 transition-all"
              disabled={isUploading}
            >
              {isUploading ? 'Đang gửi...' : '📤 Gửi'}
            </button>
          </div>
        </div>
      ) : (
        // Giao diện bình thường
        <form onSubmit={handleSubmit} className="flex items-center bg-[#f0f2f5] rounded-full px-4 py-2">
          {/* Nút cộng đính kèm (Attachment Mock) */}
          <button 
            type="button"
            className="text-[#0084ff] hover:text-[#006aff] font-black cursor-pointer text-base mr-3 transition-colors select-none"
          >
            ➕
          </button>

          {/* Nút Microphone */}
          <button 
            type="button"
            onClick={startRecording}
            className="text-gray-500 hover:text-red-500 font-black cursor-pointer text-base mr-3 transition-colors select-none"
            title="Ghi âm thoại"
          >
            🎙️
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
      )}
    </div>
  );
}