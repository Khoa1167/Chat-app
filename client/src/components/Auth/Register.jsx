import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Register() {
  const [step, setStep] = useState(1); // 1: form đăng ký, 2: nhập OTP
  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '', email: '', phone: ''
  });
  const [otp, setOtp]               = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [countdown, setCountdown]   = useState(0); // đếm ngược 5 phút
  const navigate                    = useNavigate();

  // Kiểm tra username realtime
  useEffect(() => {
    let isMounted = true;
    if (form.username.trim().length < 3) {
      setTimeout(() => {
        if (isMounted) setUsernameStatus('');
      }, 0);
      return () => {
        isMounted = false;
      };
    }

    setTimeout(() => {
      if (isMounted) setUsernameStatus('checking');
    }, 0);

    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.post('/auth/check-username', { username: form.username });
        if (isMounted) setUsernameStatus(data.available ? 'available' : 'taken');
      } catch {
        if (isMounted) setUsernameStatus('');
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [form.username]);

  // Đếm ngược 5 phút sau khi gửi OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getUsernameMsg = () => {
    if (usernameStatus === 'checking') return <span className="status-checking">⏳ Đang kiểm tra...</span>;
    if (usernameStatus === 'available') return <span className="status-available">✅ Tên tài khoản có thể dùng</span>;
    if (usernameStatus === 'taken')    return <span className="status-taken">❌ Tên tài khoản đã tồn tại</span>;
    return null;
  };

  // Bước 1: Gửi OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp'); return;
    }
    if (usernameStatus !== 'available') {
      setError('Vui lòng kiểm tra tên tài khoản'); return;
    }

    setLoading(true);
    try {
      await api.post('/auth/send-otp', {
        username: form.username,
        password: form.password,
        email:    form.email,
        phone:    form.phone,
      });
      setStep(2);
      setCountdown(300); // 5 phút
    } catch (err) {
      setError(err.response?.data?.message || 'Gửi OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác thực OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('OTP phải có 6 chữ số'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: form.email,
        otp,
      });
      sessionStorage.setItem('token', data.token);
      navigate('/set-nickname');
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại OTP
  const handleResendOTP = async () => {
    setError('');
    setOtp('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', {
        username: form.username,
        password: form.password,
        email:    form.email,
        phone:    form.phone,
      });
      setCountdown(300);
    } catch (err) {
      setError(err.response?.data?.message || 'Gửi lại OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ── Giao diện bước 1: Form đăng ký ──
  if (step === 1) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Đăng ký</h1>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleSendOTP}>
            <input
              placeholder="Tên tài khoản (tối thiểu 3 ký tự)"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required minLength={3} maxLength={30}
            />
            <div className="status-msg">{getUsernameMsg()}</div>

            <input
              type="password"
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required minLength={6}
            />

            <input
              type="password"
              placeholder="Xác nhận lại mật khẩu"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />

            <input
              placeholder="Số điện thoại (có thể bỏ trống)"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />

            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available'}
            >
              {loading ? 'Đang gửi OTP...' : 'Tiếp theo →'}
            </button>
          </form>
          <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </div>
      </div>
    );
  }

  // ── Giao diện bước 2: Nhập OTP ──
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Xác thực Email</h1>
        <p className="auth-desc">
          Mã OTP đã được gửi tới <strong>{form.email}</strong>
        </p>

        {countdown > 0 ? (
          <p className="otp-countdown">
            ⏰ Mã hết hạn sau: <strong>{formatCountdown(countdown)}</strong>
          </p>
        ) : (
          <p className="otp-expired">❌ Mã OTP đã hết hạn</p>
        )}

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleVerifyOTP}>
          <input
            placeholder="Nhập mã OTP 6 chữ số"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            style={{ letterSpacing: '8px', fontSize: '22px', textAlign: 'center' }}
            required
          />

          <button type="submit" disabled={loading || countdown === 0 || otp.length !== 6}>
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <button
            onClick={() => { setStep(1); setError(''); setOtp(''); }}
            style={{ background: 'none', border: 'none', color: '#5b5bd6', cursor: 'pointer', fontSize: '14px' }}
          >
            ← Quay lại
          </button>
          <button
            onClick={handleResendOTP}
            disabled={loading || countdown > 0}
            style={{ background: 'none', border: 'none', color: countdown > 0 ? '#aaa' : '#5b5bd6', cursor: countdown > 0 ? 'not-allowed' : 'pointer', fontSize: '14px' }}
          >
            Gửi lại OTP
          </button>
        </div>
      </div>
    </div>
  );
}