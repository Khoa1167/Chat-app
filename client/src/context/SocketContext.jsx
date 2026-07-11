/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socket = useMemo(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    return io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }, []);

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
