import React, { useState } from 'react';
import { GoogleAuthButton } from './GoogleSimModal';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onGoogleSuccess: (user: { id: string; name: string; email: string; avatar: string; status: string }) => void;
  onGoogleError: (msg: string) => void;
  onOfflineDemoLogin: () => void;
  isOnline: boolean;
  loading: boolean;
}

export const LoginForm = ({
  onLogin,
  onGoogleSuccess,
  onGoogleError,
  onOfflineDemoLogin,
  isOnline,
  loading
}: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-input-group">
        <label className="auth-input-label">Email Address</label>
        <input
          type="email"
          required
          placeholder="name@company.com"
          className="auth-input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="auth-input-group">
        <label className="auth-input-label">Password</label>
        <input
          type="password"
          required
          placeholder="••••••••"
          className="auth-input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px', marginTop: '8px', fontSize: '13px', width: '100%' }}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <div className="divider-container">Or Connect With</div>

      <GoogleAuthButton
        onSuccess={onGoogleSuccess}
        onError={onGoogleError}
        loading={loading}
      />

      {!isOnline && (
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={onOfflineDemoLogin}
            className="btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '12px' }}
          >
            Enter Offline Demo Mode
          </button>
        </div>
      )}
    </form>
  );
};
export default LoginForm;
