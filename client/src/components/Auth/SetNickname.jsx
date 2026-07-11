import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SetNickname() {
  const [nickname, setNickname]   = useState('');
  const [status, setStatus]       = useState(''); // 'checking' | 'available' | 'taken' | ''
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const navigate                  = useNavigate();
  const { setUser }               = useAuth();

  // Kiểm tra nickname realtime khi người dùng gõ
  useEffect(() => {
    let isMounted = true;
    if (nickname.trim().length < 2) {
      setTimeout(() => {
        if (isMounted) setStatus('');
      }, 0);
      return () => {
        isMounted = false;
      };
    }

    setTimeout(() => {
      if (isMounted) setStatus('checking');
    }, 0);

    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.post('/auth/check-nickname', { nickname });
        if (isMounted) setStatus(data.available ? 'available' : 'taken');
      } catch {
        if (isMounted) setStatus('');
      }
    }, 500); // debounce 500ms

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [nickname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'available') return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/set-nickname', { nickname });
      setUser(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đặt nickname thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getStatusMsg = () => {
    if (status === 'checking') return <span className="status-checking">⏳ Đang kiểm tra...</span>;
    if (status === 'available') return <span className="status-available">✅ Tên hiển thị có thể dùng</span>;
    if (status === 'taken') return <span className="status-taken">❌ Tên hiển thị đã tồn tại, vui lòng chọn tên khác</span>;
    return null;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Đặt tên hiển thị</h1>
        <p className="auth-desc">
          Tên hiển thị là tên người khác thấy khi bạn chat.
          Bạn có thể thay đổi sau.
        </p>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Tên hiển thị (nickname)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            required
            minLength={2}
            maxLength={30}
          />
          <div className="status-msg">{getStatusMsg()}</div>
          <button
            type="submit"
            disabled={loading || status !== 'available'}
          >
            {loading ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </form>
      </div>
    </div>
  );
}