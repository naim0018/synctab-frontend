import { useEffect, useRef, useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

interface GoogleAuthButtonProps {
  onSuccess: (user: {
    id: string; name: string; email: string; avatar: string; status: string;
    accentColor?: string; blurIntensity?: string; clockFormat24h?: boolean; sidebarSettings?: string;
  }) => void;
  onError: (msg: string) => void;
  loading: boolean;
}

export function GoogleAuthButton({ onSuccess, onError, loading }: GoogleAuthButtonProps) {
  const [busy, setBusy] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // Clean up old listener
  useEffect(() => {
    return () => {
      if (listenerRef.current) window.removeEventListener('message', listenerRef.current);
    };
  }, []);

  const handleGoogleLogin = () => {
    if (busy || loading) return;
    setBusy(true);

    // Remove any previous listener
    if (listenerRef.current) window.removeEventListener('message', listenerRef.current);

    // Open the OAuth popup
    const w = 520;
    const h = 600;
    const left = Math.round((window.screen.width ? (window.screen.width - w) / 2 : 0) + (window.screenLeft !== undefined ? window.screenLeft : window.screenX));
    const top = Math.round((window.screen.height ? (window.screen.height - h) / 2 : 0) + (window.screenTop !== undefined ? window.screenTop : window.screenY));
    
    const popup = window.open(
      `${API_BASE}/auth/google/login`,
      'google-oauth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,status=yes`
    );

    if (!popup) {
      onError('Popup blocked. Please allow popups for this site.');
      setBusy(false);
      return;
    }
    popupRef.current = popup;

    // Listen for postMessage from the callback page
    const listener = (event: MessageEvent) => {
      // Accept from any origin since callback is on localhost:3000
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'GOOGLE_AUTH_SUCCESS') {
        window.removeEventListener('message', listener);
        popup.close();
        setBusy(false);
        if (data.user) {
          onSuccess(data.user);
        } else {
          onError('Google login failed: no user data');
        }
      } else if (data.type === 'GOOGLE_AUTH_FAILURE') {
        window.removeEventListener('message', listener);
        popup.close();
        setBusy(false);
        onError(data.error || 'Google authentication failed');
      }
    };

    listenerRef.current = listener;
    window.addEventListener('message', listener);

    // Poll for popup close (user closed manually)
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener('message', listener);
        setBusy(false);
      }
    }, 500);
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={busy || loading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 font-semibold text-sm rounded-2xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#cbd5e1',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
    >
      {/* Google logo SVG */}
      <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>{busy ? 'Signing in...' : 'Continue with Google'}</span>
    </button>
  );
}

// Keep the old GoogleSimModal export for backward compat (unused but prevents import errors)
interface GoogleSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name: string, avatar: string) => void;
}
export const GoogleSimModal = ({ isOpen }: GoogleSimModalProps) => {
  if (!isOpen) return null;
  return null; // No longer used
};
export default GoogleSimModal;
