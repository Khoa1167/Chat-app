import { useCallback, useEffect, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocket = () => {
  const { socket, isConnected } = useSocketContext() || {};
  const pendingQueue = useRef([]);

  // Khi socket connect lại, flush queue
  useEffect(() => {
    if (isConnected && socket && pendingQueue.current.length > 0) {
      console.log(`⚡ Socket reconnected — flushing ${pendingQueue.current.length} queued event(s)`);
      pendingQueue.current.forEach(({ event, data }) => {
        socket.emit(event, data);
      });
      pendingQueue.current = [];
    }
  }, [isConnected, socket]);

  const emit = useCallback((event, data) => {
    if (!socket) {
      console.warn(`⚠️ Socket chưa khởi tạo, không thể emit: ${event}`);
      return;
    }
    if (!socket.connected) {
      // Queue lại để gửi khi kết nối xong (chỉ với các event quan trọng)
      console.warn(`⚠️ Socket chưa kết nối, queued: ${event}`);
      pendingQueue.current.push({ event, data });
      return;
    }
    socket.emit(event, data);
  }, [socket]);

  const on = useCallback((event, handler) => {
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket]);

  return { emit, on, isConnected: !!isConnected, socketRef: { current: socket } };
};