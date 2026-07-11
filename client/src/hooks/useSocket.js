import { useCallback } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocket = () => {
  const socket = useSocketContext();

  const emit = useCallback((event, data) => {
    socket?.emit(event, data);
  }, [socket]);

  const on = useCallback((event, handler) => {
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket]);

  return { emit, on, socketRef: { current: socket } };
};