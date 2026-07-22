import { useState, useEffect, useRef } from 'react';
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

// Animated mesh canvas with mouse tracking
// mouseRef is owned by the parent so events work even behind text
const MeshCanvas = ({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const NODE_COUNT = 65;
    const CONNECTION_DIST = 170;
    const MOUSE_ATTRACT_RADIUS = 220;
    const MOUSE_ATTRACT_STRENGTH = 0.012;
    const REPEL_RADIUS = 60;
    const REPEL_STRENGTH = 0.06;

    type Node = {
      x: number; y: number;
      vx: number; vy: number;
      baseVx: number; baseVy: number;
      r: number; phase: number;
    };

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => {
      const bvx = (Math.random() - 0.5) * 0.35;
      const bvy = (Math.random() - 0.5) * 0.35;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: bvx, vy: bvy,
        baseVx: bvx, baseVy: bvy,
        r: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
      };
    });

    const resize = () => {
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w; canvas.height = h;
    };
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const hasMouseActive = mx > -1000;

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.38;
            const g = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            g.addColorStop(0, `rgba(99,102,241,${alpha})`);
            g.addColorStop(0.5, `rgba(139,92,246,${alpha * 1.3})`);
            g.addColorStop(1, `rgba(6,182,212,${alpha})`);
            ctx.beginPath();
            ctx.strokeStyle = g;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw mouse cursor glow ring
      if (hasMouseActive) {
        const ringGrad = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_ATTRACT_RADIUS * 0.6);
        ringGrad.addColorStop(0, 'rgba(139,92,246,0.06)');
        ringGrad.addColorStop(0.5, 'rgba(99,102,241,0.04)');
        ringGrad.addColorStop(1, 'rgba(99,102,241,0)');
        ctx.beginPath();
        ctx.fillStyle = ringGrad;
        ctx.arc(mx, my, MOUSE_ATTRACT_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw and update nodes
      for (const node of nodes) {
        const glow = Math.sin(t + node.phase) * 0.5 + 0.5;

        // Mouse interaction
        let mouseDist = Infinity;
        if (hasMouseActive) {
          const mdx = mx - node.x;
          const mdy = my - node.y;
          mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mouseDist < REPEL_RADIUS && mouseDist > 0.1) {
            // Repel when very close
            const force = (1 - mouseDist / REPEL_RADIUS) * REPEL_STRENGTH;
            node.vx -= (mdx / mouseDist) * force;
            node.vy -= (mdy / mouseDist) * force;
          } else if (mouseDist < MOUSE_ATTRACT_RADIUS && mouseDist > 0.1) {
            // Attract toward mouse with falloff
            const falloff = (1 - mouseDist / MOUSE_ATTRACT_RADIUS);
            const force = falloff * falloff * MOUSE_ATTRACT_STRENGTH;
            node.vx += (mdx / mouseDist) * force;
            node.vy += (mdy / mouseDist) * force;
          }

          // Dampen back toward base velocity
          node.vx += (node.baseVx - node.vx) * 0.018;
          node.vy += (node.baseVy - node.vy) * 0.018;
        }

        // Cap speed
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > 3.5) { node.vx = (node.vx / speed) * 3.5; node.vy = (node.vy / speed) * 3.5; }

        const isNearMouse = hasMouseActive && mouseDist < MOUSE_ATTRACT_RADIUS * 0.4;
        const brightBoost = isNearMouse ? 0.4 : 0;
        const radius = node.r + glow * 1.5 + (isNearMouse ? 1.5 : 0);
        const glowRadius = radius * (isNearMouse ? 6 : 4);

        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
        grad.addColorStop(0, `rgba(167,139,250,${0.6 + glow * 0.4 + brightBoost})`);
        grad.addColorStop(0.4, `rgba(99,102,241,${0.3 + glow * 0.2 + brightBoost * 0.5})`);
        grad.addColorStop(1, 'rgba(99,102,241,0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${isNearMouse ? '220,200,255' : '196,181,253'},${0.75 + glow * 0.25 + brightBoost})`;
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) { node.vx *= -1; node.baseVx *= -1; }
        if (node.y < 0 || node.y > h) { node.vy *= -1; node.baseVy *= -1; }
      }

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, [mouseRef]);

  // pointer-events:none so the parent div (which covers everything incl. text) receives all mouse events
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />;
};

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
  const [mounted, setMounted] = useState(false);
  // Owned here so the parent panel div can capture events across text too
  const mouseRef = useRef({ x: -9999, y: -9999 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const handleMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: '#050810' }}>
      
      {/* ── Left Panel: Animated Mesh ── */}
      {/* onMouseMove here so it fires over BOTH the canvas AND the text */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #050810 0%, #0c0e1a 50%, #080d1a 100%)' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <MeshCanvas mouseRef={mouseRef} />

        {/* Centered content block */}
        <div className="relative z-10 flex flex-col justify-center h-full px-12 xl:px-16 space-y-8">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-xl font-black text-white tracking-tight">SyncTab</span>
          </div>

          {/* Hero copy */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#818cf8' }}>Real-time collaboration</p>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
              One workspace.<br />
              <span style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(90deg, #818cf8, #c084fc, #67e8f9)' }}>
                Infinite sync.
              </span>
            </h2>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#64748b' }}>
              Manage tabs, bookmarks, and kanban boards across every device — all in real-time.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Tab Sync', color: '#6366f1' },
              { label: 'Bookmarks', color: '#a855f7' },
              { label: 'Kanban', color: '#06b6d4' },
              { label: 'Offline Mode', color: '#10b981' },
              { label: 'Real-time', color: '#f59e0b' },
            ].map(({ label, color }) => (
              <span
                key={label}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Testimonial strip */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#f43f5e', '#3b82f6', '#10b981', '#f59e0b'].map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-[10px] font-bold" style={{ borderColor: '#050810', background: c }}>
                  {['A', 'B', 'C', 'D'][i]}
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>
              <span className="font-semibold" style={{ color: '#94a3b8' }}>2,400+</span> teams already synced
            </p>
          </div>
        </div>

        {/* Edge fade to card */}
        <div className="absolute inset-y-0 right-0 w-20 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, #050810)' }} />
      </div>

      {/* ── Right Panel: Auth Card ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative" style={{ background: '#050810' }}>
        {/* Subtle radial glow behind card */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />

        {/* Auth Card */}
        <div
          className="relative w-full max-w-[420px] rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(10,12,28,0.9)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 32px 80px rgba(0,0,0,0.6), 0 8px 32px rgba(99,102,241,0.08)',
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
            opacity: mounted ? 1 : 0,
            transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
          }}
        >
          {/* Top gradient border line */}
          <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(99,102,241,0.6), transparent)' }} />

          <div className="p-8 sm:p-10">
            {/* Mobile Brand */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="text-lg font-black text-white">SyncTab</span>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                {authTab === 'signin' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: '#64748b' }}>
                {authTab === 'signin'
                  ? 'Sign in to your workspace to continue'
                  : 'Join thousands of teams using SyncTab'}
              </p>
            </div>

            {/* Tab Toggle */}
            <div
              className="flex p-1 rounded-2xl mb-7"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {(['signin', 'register'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAuthTab(tab)}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 relative"
                  style={{
                    color: authTab === tab ? '#fff' : '#475569',
                    background: authTab === tab
                      ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                      : 'transparent',
                    boxShadow: authTab === tab ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                  }}
                >
                  {tab === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Error */}
            {authError && (
              <div
                className="flex items-start gap-3 p-3.5 rounded-xl mb-5 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5',
                }}
              >
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                <span className="font-medium leading-relaxed">{authError}</span>
              </div>
            )}

            {/* Forms */}
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
                  void (async () => {
                    const API_URL = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';
                    try {
                      const r = await fetch(`${API_URL}/auth/register`, {
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
                      onGoogleLoginDirect(d.data || d);
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
      </div>
    </div>
  );
};

export default AuthPage;
