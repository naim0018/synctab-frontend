import React, { useState } from 'react';
import { GoogleAuthButton } from './GoogleSimModal';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onGoogleSuccess: (user: { id: string; name: string; email: string; avatar: string; status: string }) => void;
  onGoogleError: (msg: string) => void;
  onOfflineDemoLogin: () => void;
  isOnline: boolean;
  loading: boolean;
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '14px',
  padding: '12px 14px 12px 42px',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

interface AuthInputProps {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  rightSlot?: React.ReactNode;
}

const AuthInput = ({ icon, type, placeholder, value, onChange, label, rightSlot }: AuthInputProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 pointer-events-none" style={{ color: focused ? '#818cf8' : '#475569', transition: 'color 0.2s' }}>
          {icon}
        </span>
        <input
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...inputBase,
            borderColor: focused ? 'rgba(129,140,248,0.6)' : 'rgba(255,255,255,0.07)',
            boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
            paddingRight: rightSlot ? '44px' : '14px',
          }}
        />
        {rightSlot && (
          <span className="absolute right-3.5" style={{ color: '#475569' }}>
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
};

export const LoginForm = ({
  onLogin,
  onGoogleSuccess,
  onGoogleError,
  onOfflineDemoLogin,
  isOnline,
  loading,
}: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthInput
        label="Email Address"
        icon={<Mail size={16} />}
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={setEmail}
      />
      <AuthInput
        label="Password"
        icon={<Lock size={16} />}
        type={showPw ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        rightSlot={
          <button type="button" onClick={() => setShowPw(!showPw)} className="hover:text-slate-300 transition-colors cursor-pointer">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      {/* Sign In Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 font-bold text-sm text-white rounded-2xl py-3.5 mt-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
        }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
        ) : (
          <>
            <LogIn size={16} />
            <span>Sign In</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          or
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Google */}
      <GoogleAuthButton onSuccess={onGoogleSuccess} onError={onGoogleError} loading={loading} />

      {/* Offline demo */}
      {!isOnline && (
        <button
          type="button"
          onClick={onOfflineDemoLogin}
          className="w-full font-semibold text-xs rounded-2xl py-3 cursor-pointer transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#475569',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
        >
          Enter Offline Demo Mode
        </button>
      )}
    </form>
  );
};

export default LoginForm;
