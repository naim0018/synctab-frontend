import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, Eye, EyeOff, Check } from 'lucide-react';

interface RegisterFormProps {
  onRegister: (name: string, email: string, password: string) => void;
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
  borderColor?: string;
  glowColor?: string;
}

const AuthInput = ({ icon, type, placeholder, value, onChange, label, rightSlot, borderColor, glowColor }: AuthInputProps) => {
  const [focused, setFocused] = useState(false);
  const bc = borderColor ?? (focused ? 'rgba(129,140,248,0.6)' : 'rgba(255,255,255,0.07)');
  const glow = glowColor ?? (focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none');
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
            borderColor: bc,
            boxShadow: glow,
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

export const RegisterForm = ({ onRegister, loading }: RegisterFormProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const confirmBorder = passwordsMismatch
    ? 'rgba(239,68,68,0.5)'
    : passwordsMatch
    ? 'rgba(16,185,129,0.5)'
    : undefined;
  const confirmGlow = passwordsMismatch
    ? '0 0 0 3px rgba(239,68,68,0.1)'
    : passwordsMatch
    ? '0 0 0 3px rgba(16,185,129,0.1)'
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    onRegister(name.trim(), email.trim(), password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && (
        <div
          className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
        >
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <AuthInput label="Full Name" icon={<User size={16} />} type="text" placeholder="John Doe" value={name} onChange={setName} />
      <AuthInput label="Work Email" icon={<Mail size={16} />} type="email" placeholder="name@company.com" value={email} onChange={setEmail} />
      <AuthInput
        label="Password"
        icon={<Lock size={16} />}
        type={showPassword ? 'text' : 'password'}
        placeholder="Min 6 characters"
        value={password}
        onChange={setPassword}
        rightSlot={
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-slate-300 transition-colors cursor-pointer">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      {/* Confirm Password with label addon */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Confirm Password
          </label>
          {passwordsMatch && (
            <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: '#10b981' }}>
              <Check size={11} /> Match
            </span>
          )}
          {passwordsMismatch && (
            <span className="text-[11px] font-bold" style={{ color: '#f87171' }}>Must match</span>
          )}
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 pointer-events-none" style={{ color: '#475569' }}><Lock size={16} /></span>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              ...inputBase,
              borderColor: confirmBorder ?? 'rgba(255,255,255,0.07)',
              boxShadow: confirmGlow ?? 'none',
              paddingRight: '44px',
            }}
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 cursor-pointer" style={{ color: '#475569' }}>
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit */}
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
            <UserPlus size={16} />
            <span>Create Free Account</span>
          </>
        )}
      </button>
    </form>
  );
};

export default RegisterForm;
