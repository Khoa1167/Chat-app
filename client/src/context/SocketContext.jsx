/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    return io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      console.log('⚡ Socket: Không thể khởi tạo do thiếu token');
      return;
    }

    console.log('⚡ Socket: Đã khởi tạo thực thể socket, đang kết nối...');

    const onConnect = () => {
      console.log('⚡ Socket: Kết nối thành công! ID:', socket.id);
      setIsConnected(true);
    };

    const onConnectError = (err) => {
      console.error('⚡ Socket: Lỗi kết nối:', err.message);
      setIsConnected(false);
    };

    const onDisconnect = (reason) => {
      console.log('⚡ Socket: Mất kết nối:', reason);
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    // Đảm bảo socket kết nối lại nếu bị ngắt trong StrictMode cleanup
    if (!socket.connected) {
      socket.connect();
    }

    // Nếu socket đã connected (từ lần trước), set ngay
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
