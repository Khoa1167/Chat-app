/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  const socket = useMemo(() => {
    if (user?._id) {
      // Tham chiếu user?._id để ép buộc khởi tạo lại socket khi người dùng thay đổi
    }
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    return io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }, [user?._id]);

  useEffect(() => {
    if (!socket) {
      console.log('⚡ Socket: Không thể khởi tạo do thiếu token');
      return;
    }

    console.log('⚡ Socket: Đã khởi tạo thực thể socket, đang kết nối...');

    let timer;

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

    // Nếu socket đã connected (từ lần trước), set ngay bằng setTimeout để tránh cảnh báo đồng bộ của react
    if (socket.connected) {
      timer = setTimeout(() => {
        setIsConnected(true);
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
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
