/**
 * AdminLogin.jsx
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminLogin, setTokens } from '../admin_api';
import { useAuth } from '../AdminApp';

export default function AdminLogin() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin-panel';

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(form.username, form.password);
      setTokens(data.access, data.refresh);
      setUser(data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        {/* Logo */}
        <div className="login-logo">
          <div style={{
            background: 'var(--ad-red)', color: '#fff',
            width: 44, height: 44, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1rem',
          }}>DL</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1, color: 'var(--ad-text)' }}>DREAMLINE</div>
            <div style={{ fontSize: '.65rem', color: 'var(--ad-text-muted)', letterSpacing: 1 }}>ADMIN PANEL</div>
          </div>
        </div>

        <h2 style={{ fontWeight: 800, marginBottom: 6, fontSize: '1.3rem' }}>Welcome back</h2>
        <p style={{ color: 'var(--ad-text-muted)', fontSize: '.85rem', marginBottom: '1.5rem' }}>
          Sign in to access the dashboard
        </p>

        {error && (
          <div className="ad-alert ad-alert-error">
            <i className="bi bi-exclamation-circle-fill"></i>{error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="ad-form-group">
            <label className="ad-label">Username</label>
            <input
              className="ad-input"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoFocus
              required
            />
          </div>
          <div className="ad-form-group">
            <label className="ad-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="ad-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{
                  position: 'absolute', right: '.7rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--ad-text-muted)', fontSize: '.9rem',
                }}
              >
                <i className={`bi bi-eye${showPw ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-ad btn-ad-primary w-100 btn-ad-lg"
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: '.5rem' }}
          >
            {loading
              ? <><div className="ad-spinner-sm ad-spinner"></div> Signing in...</>
              : <><i className="bi bi-shield-lock-fill"></i> Sign In</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.75rem', color: 'var(--ad-text-muted)' }}>
          Dreamline Bus Services &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}