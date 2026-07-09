import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { LoginForm } from '../../components/Auth/LoginForm';
import { RegisterForm } from '../../components/Auth/RegisterForm';

interface AuthPageProps {
  onLogin: (email: string, password: string) => void;
  onGoogleLogin: (email: string, name: string, avatar: string) => void;
  onGoogleLoginDirect: (user: { id: string; name: string; email: string; avatar: string; status: string }) => void;
  onOfflineDemoLogin: () => void;
  isOnline: boolean;
  loading: boolean;
  authError: string | null;
  onAuthError: (msg: string) => void;
}

export const AuthPage = ({
  onLogin,
  onGoogleLoginDirect,
  onOfflineDemoLogin,
  isOnline,
  loading,
  authError,
  onAuthError,
}: AuthPageProps) => {
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');

  return (
    <div className="auth-screen-container">
      <div className="auth-card glass-panel">
        <div className="auth-logo-section">
          <div className="auth-logo-badge">
            <span style={{ fontSize: '24px' }}>⚡</span>
          </div>
          <h2 className="auth-brand-title">SyncTab Workspace</h2>
          <p className="auth-brand-subtitle">
            Synchronized dashboard panels, bookmarks, tasks, and real-time team synchronization.
          </p>
        </div>

        <div className="auth-tabs-row">
          <button
            className={`auth-tab-btn ${authTab === 'signin' ? 'active' : ''}`}
            onClick={() => setAuthTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
            onClick={() => setAuthTab('register')}
          >
            Create Account
          </button>
        </div>

        {authError && (
          <div className="auth-error-box">
            <AlertCircle size={14} /> {authError}
          </div>
        )}

        {authTab === 'signin' ? (
          <LoginForm
            onLogin={onLogin}
            onGoogleSuccess={onGoogleLoginDirect}
            onGoogleError={onAuthError}
            onOfflineDemoLogin={onOfflineDemoLogin}
            isOnline={isOnline}
            loading={loading}
          />
        ) : (
          <RegisterForm
            onRegister={(name, email, password) => {
              // Register then login
              void (async () => {
                const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';
                try {
                  const r = await fetch(`${API}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password }),
                  });
                  if (!r.ok) {
                    const d = await r.json();
                    onAuthError(d.message || 'Registration failed');
                    return;
                  }
                  const d = await r.json();
                  const user = d.data || d;
                  onGoogleLoginDirect(user);
                } catch {
                  onAuthError('Network error during registration');
                }
              })();
            }}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};
export default AuthPage;
