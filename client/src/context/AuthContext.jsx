/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Khởi tạo loading dựa trên token có sẵn không
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(!!sessionStorage.getItem('token'));

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return; // loading đã là false từ đầu

    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => sessionStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    sessionStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);