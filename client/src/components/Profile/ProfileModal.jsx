import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function ProfileModal({ onClose }) {
  const { user, setUser } = useAuth();
  const [tab, setTab]     = useState('info'); // 'info' | 'password'
  const [now] = useState(() => Date.now());
  const fileInputRef      = useRef(null);

  // ── Form thông tin ──
  const [form, setForm]   = useState({
    nickname: user.nickname || '',
    email:    user.email || '',
    phone:    user.phone || '',
  });
  const [nicknameStatus, setNicknameStatus] = useState('');
  const [infoError, setInfoError]   = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');

  // ── Form đổi mật khẩu ──
  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });
  const [pwError, setPwError]     = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');

  // ── Avatar ──
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || '');
  const [avatarFile, setAvatarFile]       = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Kiểm tra nickname realtime
  const checkNickname = async (value) => {
    setForm(prev => ({ ...prev, nickname: value }));
    if (value === user.nickname || value.trim().length < 2) {
      setNicknameStatus(''); return;
    }
    setNicknameStatus('checking');
    try {
      const { data } = await api.post('/auth/check-nickname', { nickname: value });
      setNicknameStatus(data.available ? 'available' : 'taken');
    } catch {
      setNicknameStatus('');
    }
  };

  const handleSelectAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data);
      setAvatarFile(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload avatar thất bại');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoError('');
    setInfoSuccess('');

    if (nicknameStatus === 'taken') {
      setInfoError('Tên hiển thị đã tồn tại'); return;
    }

    setInfoLoading(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      setUser(data);
      setInfoSuccess('Cập nhật thành công!');
    } catch (err) {
      setInfoError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Mật khẩu mới xác nhận không khớp'); return;
    }

    setPwLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('Đổi mật khẩu thành công!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setPwLoading(false);
    }
  };

  const getNicknameMsg = () => {
    if (nicknameStatus === 'checking') return <span className="status-checking">⏳ Đang kiểm tra...</span>;
    if (nicknameStatus === 'available') return <span className="status-available">✅ Có thể dùng</span>;
    if (nicknameStatus === 'taken')    return <span className="status-taken">❌ Đã tồn tại</span>;
    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Thông tin cá nhân</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Avatar */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper" onClick={() => fileInputRef.current.click()}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-placeholder">
                {(user.nickname || user.username)[0].toUpperCase()}
              </div>
            )}
            <div className="profile-avatar-overlay">📷</div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleSelectAvatar}
          />
          {avatarFile && (
            <button
              className="profile-avatar-save"
              onClick={handleUploadAvatar}
              disabled={avatarLoading}
            >
              {avatarLoading ? 'Đang tải lên...' : 'Lưu avatar'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>
            Thông tin
          </button>
          <button className={tab === 'password' ? 'active' : ''} onClick={() => setTab('password')}>
            Đổi mật khẩu
          </button>
        </div>

        {/* Tab: Thông tin */}
        {tab === 'info' && (
          <form onSubmit={handleSaveInfo} className="profile-form">
            <label>Tên tài khoản</label>
            <input value={user.username} disabled className="profile-input-disabled" />

            <label>Tên hiển thị</label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                 Tên hiển thị chỉ được thay đổi <strong>7 ngày 1 lần</strong>
              </p>
              {(() => {
                const canChange = !user.nicknameChangedAt ||
                  (now - new Date(user.nicknameChangedAt)) / (1000 * 60 * 60 * 24) >= 7;
                const daysLeft = user.nicknameChangedAt
                  ? Math.ceil(7 - (now - new Date(user.nicknameChangedAt)) / (1000 * 60 * 60 * 24))
                  : 0;

                return canChange ? (
                  <>
                    <input
                      value={form.nickname}
                      onChange={e => checkNickname(e.target.value)}
                      minLength={2}
                    />
                    <div className="status-msg">{getNicknameMsg()}</div>
                  </>
                ) : (
                  <>
                    <input value={form.nickname} disabled className="profile-input-disabled" />
                    <p className="nickname-cooldown">
                       Còn <strong>{daysLeft} ngày</strong> nữa mới được đổi tên hiển thị
                    </p>
                  </>
                );
              })()}

            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />

            <label>Số điện thoại</label>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="Chưa có số điện thoại"
            />

            {infoError && <p className="error-msg">{infoError}</p>}
            {infoSuccess && <p className="success-msg">{infoSuccess}</p>}

            <button type="submit" disabled={infoLoading}>
              {infoLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        )}

        {/* Tab: Đổi mật khẩu */}
        {tab === 'password' && (
          <form onSubmit={handleChangePassword} className="profile-form">
            <label>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              required
            />

            <label>Mật khẩu mới</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
              required minLength={6}
            />

            <label>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              required
            />

            {pwError && <p className="error-msg">{pwError}</p>}
            {pwSuccess && <p className="success-msg">{pwSuccess}</p>}

            <button type="submit" disabled={pwLoading}>
              {pwLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}