import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ==================== CLOCK ====================
export const ClockWidget: React.FC<{ widgetId?: string; config?: Record<string, any> }> = ({ widgetId, config }) => {
  const [now, setNow] = useState(new Date());
  const [is24h, setIs24h] = useState(() => {
    if (config && config['synctab-clock-format-24h'] !== undefined) {
      return config['synctab-clock-format-24h'] === 'true' || config['synctab-clock-format-24h'] === true;
    }
    return localStorage.getItem('synctab-clock-format-24h') === 'true';
  });
  const [useSerif, setUseSerif] = useState(() => {
    if (config && config[`synctab_clock_serif_${widgetId}`] !== undefined) {
      return config[`synctab_clock_serif_${widgetId}`] !== 'false' && config[`synctab_clock_serif_${widgetId}`] !== false;
    }
    return localStorage.getItem(`synctab_clock_serif_${widgetId}`) !== 'false';
  });
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (config) {
      if (config['synctab-clock-format-24h'] !== undefined) {
        setIs24h(config['synctab-clock-format-24h'] === 'true' || config['synctab-clock-format-24h'] === true);
      }
      if (config[`synctab_clock_serif_${widgetId}`] !== undefined) {
        setUseSerif(config[`synctab_clock_serif_${widgetId}`] !== 'false' && config[`synctab_clock_serif_${widgetId}`] !== false);
      }
    }
  }, [config, widgetId]);

  useEffect(() => {
    if (!widgetId) return;
    const handleConfig = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.widgetId === widgetId) {
        setIsConfiguring(prev => !prev);
      }
    };
    window.addEventListener(`synctab-configure-${widgetId}`, handleConfig);
    return () => window.removeEventListener(`synctab-configure-${widgetId}`, handleConfig);
  }, [widgetId]);

  const save = () => {
    localStorage.setItem('synctab-clock-format-24h', String(is24h));
    localStorage.setItem(`synctab_clock_serif_${widgetId}`, String(useSerif));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('synctab-widgets-sync'));
    setIsConfiguring(false);
  };

  if (isConfiguring) {
    return (
      <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8, fontSize: '11px', justifyContent: 'center', padding: '10px', boxSizing: 'border-box' }} 
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Clock Settings</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={is24h} onChange={e => setIs24h(e.target.checked)} style={{ accentColor: '#10b981' }} />
          24-Hour Format
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={useSerif} onChange={e => setUseSerif(e.target.checked)} style={{ accentColor: '#10b981' }} />
          Use Serif Font
        </label>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button onClick={save} style={{ background: '#10b981', border: 'none', borderRadius: '4px', color: '#fff', padding: '4px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>Save</button>
          <button onClick={() => setIsConfiguring(false)} style={{ background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-secondary)', padding: '4px 10px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h });
  const amPm = !is24h ? (now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split(' ')[1] || '') : '';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      height: '100%',
      gap: '6px',
      fontFamily: useSerif ? 'var(--font-serif), Georgia, serif' : 'var(--font-sans), sans-serif',
      color: 'var(--text-primary)',
      textShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
      userSelect: 'none'
    }}>
      <span style={{ fontSize: 'clamp(3.5rem, 9vw, 6rem)', fontWeight: 400, lineHeight: 1 }}>
        {timeStr.split(' ')[0]}
      </span>
      {amPm && (
        <span style={{
          fontSize: 'clamp(14px, 2vw, 20px)',
          fontWeight: 800,
          textTransform: 'uppercase',
          color: '#10b981',
          letterSpacing: '0.5px',
          lineHeight: 1
        }}>
          {amPm}
        </span>
      )}
    </div>
  );
};

// ==================== GREETING ====================
export const GreetingWidget: React.FC<{ widgetId?: string; userName?: string; config?: Record<string, any> }> = ({ widgetId, userName, config }) => {
  const [now, setNow] = useState(new Date());
  const [customGreeting, setCustomGreeting] = useState(() => {
    if (config && config['synctab-custom-greeting'] !== undefined) {
      return config['synctab-custom-greeting'];
    }
    return localStorage.getItem('synctab-custom-greeting') || '';
  });
  const [tempGreeting, setTempGreeting] = useState(customGreeting);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (config && config['synctab-custom-greeting'] !== undefined) {
      setCustomGreeting(config['synctab-custom-greeting']);
      setTempGreeting(config['synctab-custom-greeting']);
    }
  }, [config]);

  useEffect(() => {
    if (!widgetId) return;
    const handleConfig = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.widgetId === widgetId) {
        setIsConfiguring(prev => !prev);
      }
    };
    window.addEventListener(`synctab-configure-${widgetId}`, handleConfig);
    return () => window.removeEventListener(`synctab-configure-${widgetId}`, handleConfig);
  }, [widgetId]);

  const save = () => {
    localStorage.setItem('synctab-custom-greeting', tempGreeting);
    setCustomGreeting(tempGreeting);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('synctab-widgets-sync'));
    setIsConfiguring(false);
  };

  if (isConfiguring) {
    return (
      <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8, fontSize: '11px', justifyContent: 'center', padding: '10px', boxSizing: 'border-box' }} 
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Greeting Settings</div>
        <input 
          value={tempGreeting} 
          onChange={e => setTempGreeting(e.target.value)}
          placeholder="Custom Name / Greeting" 
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#fff', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button onClick={save} style={{ background: '#f59e0b', border: 'none', borderRadius: '4px', color: '#1a202c', padding: '4px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>Save</button>
          <button onClick={() => { setIsConfiguring(false); setTempGreeting(customGreeting); }} style={{ background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-secondary)', padding: '4px 10px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  const hour = now.getHours();
  const displayName = userName?.split(' ')[0] || 'User';

  let greeting = customGreeting;
  if (!greeting) {
    if (hour < 12) greeting = `Good morning, ${displayName}`;
    else if (hour < 18) greeting = `Good afternoon, ${displayName}`;
    else greeting = `Good evening, ${displayName}`;
  }

  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      textAlign: 'center',
      userSelect: 'none'
    }}>
      <div style={{
        fontFamily: 'var(--font-serif), Georgia, serif',
        fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
        fontWeight: 400,
        color: 'var(--text-primary)',
        textShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
        lineHeight: 1.2
      }}>
        {greeting}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans), sans-serif',
        fontSize: 'clamp(9px, 1.5vw, 11px)',
        fontWeight: 600,
        letterSpacing: '1.5px',
        color: 'var(--text-secondary)',
        marginTop: '8px',
        opacity: 0.8,
        textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)'
      }}>
        {dateStr}
      </div>
    </div>
  );
};

// ==================== CALENDAR ====================
export const CalendarWidget: React.FC = () => {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isToday = (d: number) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, fontSize: '11px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setViewDate(new Date(y, m - 1))} style={navBtn}>‹</button>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setViewDate(new Date(y, m + 1))} style={navBtn}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', padding: '2px 0' }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', padding: '3px 2px', borderRadius: '50%',
            background: d && isToday(d) ? 'var(--primary)' : 'transparent',
            color: d ? (isToday(d) ? '#fff' : 'var(--text-primary)') : 'transparent',
            fontWeight: d && isToday(d) ? 700 : 400,
            fontSize: '10px',
          }}>{d ?? ''}</div>
        ))}
      </div>
    </div>
  );
};

const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)',
  borderRadius: '6px', width: '24px', height: '24px', color: 'var(--text-secondary)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
};

// ==================== WEATHER ====================
interface WData { temp_C: string; weatherDesc: { value: string }[]; windspeedKmph: string; humidity: string; }

const W_ICONS: Record<string, string> = {
  'Sunny': '☀️', 'Clear': '✨', 'Partly cloudy': '⛅', 'Cloudy': '☁️', 'Overcast': '☁️',
  'Mist': '🌫️', 'Light rain': '🌦️', 'Moderate rain': '🌧️', 'Heavy rain': '⛈️',
  'Light snow': '🌨️', 'Thunderstorm': '⛈️', 'Fog': '🌫️', 'Blizzard': '🌨️',
};

export const WeatherWidget: React.FC = () => {
  const [w, setW] = useState<WData | null>(null);
  const [city, setCity] = useState('');
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch('https://wttr.in/?format=j1')
      .then(r => r.json())
      .then((d: { current_condition: WData[]; nearest_area: { areaName: { value: string }[] }[] }) => {
        setW(d.current_condition[0]);
        setCity(d.nearest_area?.[0]?.areaName?.[0]?.value ?? '');
      }).catch(() => setErr(true));
  }, []);
  if (err) return <Msg>Weather unavailable</Msg>;
  if (!w) return <Msg>Loading weather…</Msg>;
  const desc = w.weatherDesc[0].value;
  const icon = Object.entries(W_ICONS).find(([k]) => desc.toLowerCase().includes(k.toLowerCase()))?.[1] ?? '🌡️';
  const c = parseInt(w.temp_C);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%', padding: '0 8px' }}>
      <div style={{ fontSize: '3rem', lineHeight: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{c}°C</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{desc}</div>
        {city && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>📍 {city}</div>}
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>💧{w.humidity}% · 💨{w.windspeedKmph}km/h</div>
      </div>
    </div>
  );
};

// ==================== SEARCH ====================
export const SearchWidget: React.FC<{ widgetId?: string; config?: Record<string, any> }> = ({ widgetId, config }) => {
  const [q, setQ] = useState('');
  const [engine, setEngine] = useState<'google' | 'bing'>(() => {
    if (config && config['synctab-search-engine'] !== undefined) {
      return config['synctab-search-engine'] as 'google' | 'bing';
    }
    return (localStorage.getItem('synctab-search-engine') as 'google' | 'bing') || 'google';
  });
  const [showEngineDropdown, setShowEngineDropdown] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (config && config['synctab-search-engine'] !== undefined) {
      setEngine(config['synctab-search-engine'] as 'google' | 'bing');
    }
  }, [config]);

  useEffect(() => {
    if (!widgetId) return;
    const handleConfig = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.widgetId === widgetId) {
        setIsConfiguring(prev => !prev);
      }
    };
    window.addEventListener(`synctab-configure-${widgetId}`, handleConfig);
    return () => window.removeEventListener(`synctab-configure-${widgetId}`, handleConfig);
  }, [widgetId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const url = engine === 'google'
      ? `https://www.google.com/search?q=${encodeURIComponent(q)}`
      : `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setQ('');
  };

  if (isConfiguring) {
    return (
      <div 
        style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, fontSize: '11px', padding: '10px', boxSizing: 'border-box' }} 
        onMouseDown={e => e.stopPropagation()}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Default Search:</span>
        <select 
          value={engine} 
          onChange={e => { setEngine(e.target.value as 'google' | 'bing'); localStorage.setItem('synctab-search-engine', e.target.value); window.dispatchEvent(new Event('synctab-widgets-sync')); }}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: '#fff', padding: '4px 8px', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="google" style={{ background: '#1e1e2f' }}>Google</option>
          <option value="bing" style={{ background: '#1e1e2f' }}>Bing</option>
        </select>
        <button 
          onClick={() => setIsConfiguring(false)} 
          style={{ background: 'linear-gradient(135deg, #00b4db, #0083b0)', border: 'none', borderRadius: '6px', color: '#fff', padding: '5px 12px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '30px',
      padding: '4px 4px 4px 16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      boxSizing: 'border-box',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}
    onFocus={e => {
      e.currentTarget.style.background = 'rgba(14, 16, 27, 0.65)';
      e.currentTarget.style.borderColor = 'var(--primary)';
      e.currentTarget.style.boxShadow = '0 10px 35px var(--primary-glow)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onBlur={e => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
      e.currentTarget.style.transform = 'none';
    }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setShowEngineDropdown(!showEngineDropdown)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px 0 0',
            fontWeight: 600
          }}
        >
          {engine === 'google' ? 'G' : 'B'}
          <span style={{ fontSize: '8px', marginLeft: '2px', opacity: 0.7 }}>▼</span>
        </button>

        {showEngineDropdown && (
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '0',
            background: '#1f1f1f',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 10,
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => { setEngine('google'); localStorage.setItem('synctab-search-engine', 'google'); window.dispatchEvent(new Event('synctab-widgets-sync')); setShowEngineDropdown(false); }}
              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '6px 12px', fontSize: '11px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => { setEngine('bing'); localStorage.setItem('synctab-search-engine', 'bing'); window.dispatchEvent(new Event('synctab-widgets-sync')); setShowEngineDropdown(false); }}
              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '6px 12px', fontSize: '11px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Bing
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={engine === 'google' ? 'Search Google...' : 'Search Bing...'}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '14px',
          padding: '8px 0'
        }}
      />

      <button
        type="submit"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00b4db, #0083b0)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </form>
  );
};

// ==================== NOTES ====================
export const NotesWidget: React.FC<{ widgetId: string; config?: Record<string, any> }> = ({ widgetId, config }) => {
  const key = `synctab_wn_${widgetId}`;
  const [text, setText] = useState(() => {
    if (config && config[key] !== undefined) {
      return config[key];
    }
    return localStorage.getItem(key) ?? '';
  });

  useEffect(() => {
    if (config && config[key] !== undefined) {
      setText(config[key]);
    }
  }, [config, key]);

  const save = (v: string) => {
    setText(v);
    localStorage.setItem(key, v);
    window.dispatchEvent(new Event('synctab-widgets-sync'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>📝 Quick Note</div>
      <textarea value={text} onChange={e => save(e.target.value)} placeholder="Type here…"
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontSize: '12px', lineHeight: 1.6, fontFamily: 'inherit' }} />
    </div>
  );
};

// ==================== QUOTES ====================
const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Strive not to be a success, but rather to be of value.', author: 'Albert Einstein' },
  { text: 'The mind is everything. What you think, you become.', author: 'Buddha' },
];

export const QuotesWidget: React.FC = () => {
  const todayIdx = new Date().getDate() % QUOTES.length;
  const q = QUOTES[todayIdx];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 10 }}>
      <div style={{ fontSize: '28px', color: 'var(--primary)', lineHeight: 1, opacity: 0.7 }}>"</div>
      <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>{q.text}</div>
      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>— {q.author}</div>
    </div>
  );
};

// ==================== TASKS ====================
export const TasksWidget: React.FC<{ tasks: { id: string; title: string; status: string; priority: string }[] }> = ({ tasks }) => {
  const pending = tasks.filter(t => t.status !== 'DONE').slice(0, 8);
  if (pending.length === 0) return <Msg>🎉 No pending tasks!</Msg>;
  const priorityColor = (p: string) => p === 'HIGH' ? '#ef4444' : p === 'MEDIUM' ? '#f59e0b' : '#6b7280';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>✅ Tasks ({pending.length})</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {pending.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor(t.priority), flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== BOOKMARKS ====================
interface BookmarkItem { id: string; title: string; url: string; }

export const BookmarksWidget: React.FC<{
  bookmarks: BookmarkItem[];
  widgetId: string;
  config?: Record<string, any>;
}> = ({ bookmarks: _bookmarks, widgetId, config }) => {
  const [viewMode, setViewMode] = useState<'icons' | 'list'>(() => {
    let modeVal = '';
    if (config && typeof config[`synctab_bm_mode_${widgetId}`] === 'string') {
      modeVal = config[`synctab_bm_mode_${widgetId}`];
    } else if (config && typeof config.viewMode === 'string') {
      modeVal = config.viewMode;
    } else {
      modeVal = localStorage.getItem(`synctab_bm_mode_${widgetId}`) || '';
    }

    if (['top_sites', 'recently_closed', 'recent_top_sites'].includes(modeVal)) {
      return 'list';
    }
    return (modeVal as any) || 'icons';
  });

  const [dataSource, setDataSource] = useState<'custom' | 'top_sites' | 'recently_closed' | 'recent_top_sites' | 'open_tabs'>(() => {
    let sourceVal = '';
    if (config && typeof config[`synctab_bm_source_${widgetId}`] === 'string') {
      sourceVal = config[`synctab_bm_source_${widgetId}`];
    } else if (config && typeof config.viewMode === 'string') {
      const vm = config.viewMode;
      if (['open_tabs', 'top_sites', 'recently_closed', 'bookmarks_list'].includes(vm)) {
        sourceVal = vm === 'bookmarks_list' ? 'custom' : vm;
      }
    }

    if (!sourceVal) {
      sourceVal = localStorage.getItem(`synctab_bm_source_${widgetId}`) || '';
    }

    if (sourceVal) {
      return sourceVal as any;
    }

    // Migration fallback based on old viewMode
    let oldMode = '';
    if (config && typeof config[`synctab_bm_mode_${widgetId}`] === 'string') {
      oldMode = config[`synctab_bm_mode_${widgetId}`];
    } else {
      oldMode = localStorage.getItem(`synctab_bm_mode_${widgetId}`) || '';
    }

    if (['top_sites', 'recently_closed', 'recent_top_sites', 'open_tabs'].includes(oldMode)) {
      return oldMode as any;
    }
    return 'custom';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const topSitesList = [
    { id: 'ts1', title: 'Google', url: 'https://google.com' },
    { id: 'ts2', title: 'YouTube', url: 'https://youtube.com' },
    { id: 'ts3', title: 'GitHub', url: 'https://github.com' },
    { id: 'ts4', title: 'Wikipedia', url: 'https://wikipedia.org' },
    { id: 'ts5', title: 'Reddit', url: 'https://reddit.com' },
    { id: 'ts6', title: 'Facebook', url: 'https://facebook.com' },
    { id: 'ts7', title: 'Twitter', url: 'https://twitter.com' },
    { id: 'ts8', title: 'Amazon', url: 'https://amazon.com' },
  ];

  const recentlyClosedList = [
    { id: 'rc1', title: 'Stack Overflow - Where Developers Learn', url: 'https://stackoverflow.com' },
    { id: 'rc2', title: 'Gmail - Google Email Service', url: 'https://mail.google.com' },
    { id: 'rc3', title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com' },
    { id: 'rc4', title: 'React Dev Tools', url: 'https://react.dev' },
    { id: 'rc5', title: 'Vite Guide', url: 'https://vitejs.dev' },
  ];

  const recentTopSitesList = [
    { id: 'rts1', title: 'Google', url: 'https://google.com' },
    { id: 'rts2', title: 'YouTube', url: 'https://youtube.com' },
    { id: 'rts3', title: 'GitHub', url: 'https://github.com' },
    { id: 'rts4', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { id: 'rts5', title: 'Gmail', url: 'https://mail.google.com' },
  ];

  const [topSites, setTopSites] = useState<Array<{ id: string; title: string; url: string }>>(() => topSitesList);
  const [recentlyClosed, setRecentlyClosed] = useState<Array<{ id: string; title: string; url: string }>>(() => recentlyClosedList);
  const [recentTopSites, setRecentTopSites] = useState<Array<{ id: string; title: string; url: string }>>(() => recentTopSitesList);

  const [openTabs, setOpenTabs] = useState<Array<{ id: string; title: string; url: string }>>(() => {
    try {
      const saved = localStorage.getItem('synctab_recent_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any, idx: number) => ({ id: t.id || `tab_${idx}`, title: t.title, url: t.url }));
        }
      }
    } catch {}
    return [
      { id: 't1', title: '(1) Angular', url: 'https://angular.io' },
      { id: 't2', title: 'Unsplash - Beautiful Free Images & Pictures', url: 'https://unsplash.com' },
      { id: 't3', title: 'Tabm Dashboard', url: 'https://tabm.co' },
      { id: 't4', title: 'Vitech Systems', url: 'https://vitech.com' },
      { id: 't5', title: 'From C to WebAssembly', url: 'https://fromc.org' },
      { id: 't6', title: 'YouTube', url: 'https://youtube.com' },
      { id: 't7', title: 'Pexels - Free Stock Photos', url: 'https://pexels.com' },
      { id: 't8', title: 'GitHub - naim0018/SyncTab', url: 'https://github.com/naim0018/SyncTab' },
      { id: 't9', title: 'Glance Dev Tools', url: 'https://glance.intl' },
      { id: 't10', title: 'Google', url: 'https://google.com' },
      { id: 't11', title: '(4) ChatGPT', url: 'https://chatgpt.com' },
      { id: 't12', title: 'Google Translate', url: 'https://translate.google.com' },
      { id: 't13', title: 'frontend - SyncTab Dev', url: 'http://localhost:5173' }
    ];
  });

  const processAndSetTabs = useCallback((tabs: any[]) => {
    const formatted = tabs
      .filter(t => {
        if (!t || !t.url || !t.title) return false;
        const u = t.url.toLowerCase();
        return !u.startsWith('chrome://') && 
               !u.startsWith('chrome-extension://') && 
               !u.startsWith('about:') && 
               !u.startsWith('edge://');
      })
      .map((t, idx) => ({
        id: t.id?.toString() || `tab_${idx}_${Date.now()}`,
        title: t.title || '',
        url: t.url || ''
      }));
    
    if (formatted.length > 0) {
      setOpenTabs(formatted);
    }
  }, []);

  const refreshOpenTabs = useCallback(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).chrome &&
        (window as any).chrome.tabs &&
        typeof (window as any).chrome.tabs.query === 'function'
      ) {
        (window as any).chrome.tabs.query({}, (tabs: any[]) => {
          if (Array.isArray(tabs)) {
            processAndSetTabs(tabs);
          }
        });
      } else if (typeof window !== 'undefined') {
        window.postMessage({ type: 'SYNCTAB_QUERY_TABS' }, '*');
      }
    } catch (e) {
      console.warn("Failed to query chrome tabs, keeping mock tabs:", e);
    }
  }, [processAndSetTabs]);

  const refreshTopSites = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).chrome) {
        console.log("SyncTab: [Top Sites] window.chrome properties:", Object.keys((window as any).chrome));
        if ((window as any).chrome.runtime && typeof (window as any).chrome.runtime.getManifest === 'function') {
          console.log("SyncTab: [Top Sites] Active manifest permissions:", (window as any).chrome.runtime.getManifest()?.permissions);
        }
      }
      if (
        typeof window !== 'undefined' &&
        (window as any).chrome &&
        (window as any).chrome.topSites &&
        typeof (window as any).chrome.topSites.get === 'function'
      ) {
        console.log("SyncTab: [Top Sites] API detected. Querying Chrome...");
        (window as any).chrome.topSites.get((sites: any[]) => {
          console.log("SyncTab: [Top Sites] Chrome returned raw sites:", sites);
          if (Array.isArray(sites)) {
            const formatted = sites
              .filter(s => s && s.url)
              .map((s, index) => ({
                id: `ts_real_${index}`,
                title: s.title || getDomain(s.url),
                url: s.url || ''
              }));
            console.log("SyncTab: [Top Sites] Formatted result list:", formatted);
            if (formatted.length > 0) {
              setTopSites(formatted);
              setRecentTopSites(formatted.slice(0, 5));
            } else {
              console.log("SyncTab: [Top Sites] Formatted list is empty, using fallback mock data.");
            }
          }
        });
      } else {
        console.log("SyncTab: [Top Sites] API not available. Using mock data.");
      }
    } catch (e) {
      console.warn("Failed to query chrome topSites, keeping mock:", e);
    }
  }, []);

  const refreshRecentlyClosed = useCallback(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).chrome &&
        (window as any).chrome.sessions &&
        typeof (window as any).chrome.sessions.getRecentlyClosed === 'function'
      ) {
        console.log("SyncTab: [Recently Closed] Sessions API detected. Querying Chrome...");
        (window as any).chrome.sessions.getRecentlyClosed({ maxResults: 15 }, (sessions: any[]) => {
          console.log("SyncTab: [Recently Closed] Chrome returned raw sessions:", sessions);
          if (Array.isArray(sessions)) {
            const items: Array<{ id: string; title: string; url: string }> = [];
            sessions.forEach((s, index) => {
              if (s.tab && s.tab.url) {
                items.push({
                  id: `rc_real_t_${index}`,
                  title: s.tab.title || getDomain(s.tab.url),
                  url: s.tab.url
                });
              } else if (s.window && Array.isArray(s.window.tabs)) {
                s.window.tabs.forEach((t: any, tIdx: number) => {
                  if (t && t.url) {
                    items.push({
                      id: `rc_real_w_${index}_${tIdx}`,
                      title: t.title || getDomain(t.url),
                      url: t.url
                    });
                  }
                });
              }
            });
            console.log("SyncTab: [Recently Closed] Formatted list:", items);
            if (items.length > 0) {
              setRecentlyClosed(items);
            } else {
              console.log("SyncTab: [Recently Closed] Formatted list is empty, using fallback mock data.");
            }
          }
        });
      } else {
        console.log("SyncTab: [Recently Closed] Sessions API not available. Using mock data.");
      }
    } catch (e) {
      console.warn("Failed to query chrome recently closed, keeping mock:", e);
    }
  }, []);

  useEffect(() => {
    refreshTopSites();
    refreshRecentlyClosed();

    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).chrome &&
        (window as any).chrome.sessions &&
        (window as any).chrome.sessions.onChanged
      ) {
        const sessionsAPI = (window as any).chrome.sessions;
        const listener = () => {
          refreshRecentlyClosed();
        };
        if (sessionsAPI.onChanged.addListener) {
          sessionsAPI.onChanged.addListener(listener);
        }
        return () => {
          try {
            sessionsAPI.onChanged.removeListener(listener);
          } catch {}
        };
      }
    } catch (e) {
      console.warn("Failed to set up chrome sessions event listeners:", e);
    }
  }, [refreshTopSites, refreshRecentlyClosed]);

  useEffect(() => {
    refreshOpenTabs();

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'SYNCTAB_TABS_RESPONSE') {
        if (Array.isArray(event.data.tabs)) {
          processAndSetTabs(event.data.tabs);
        }
      } else if (event.data && event.data.type === 'SYNCTAB_TABS_UPDATED') {
        refreshOpenTabs();
      }
    };
    window.addEventListener('message', handleMessage);

    try {
      const hasChromeTabs = typeof window !== 'undefined' && 
                            (window as any).chrome && 
                            (window as any).chrome.tabs;
      
      if (hasChromeTabs) {
        const tabsAPI = (window as any).chrome.tabs;
        
        const listener = () => {
          refreshOpenTabs();
        };

        if (tabsAPI.onCreated && typeof tabsAPI.onCreated.addListener === 'function') {
          tabsAPI.onCreated.addListener(listener);
        }
        if (tabsAPI.onUpdated && typeof tabsAPI.onUpdated.addListener === 'function') {
          tabsAPI.onUpdated.addListener(listener);
        }
        if (tabsAPI.onRemoved && typeof tabsAPI.onRemoved.addListener === 'function') {
          tabsAPI.onRemoved.addListener(listener);
        }
        if (tabsAPI.onMoved && typeof tabsAPI.onMoved.addListener === 'function') {
          tabsAPI.onMoved.addListener(listener);
        }
        if (tabsAPI.onActivated && typeof tabsAPI.onActivated.addListener === 'function') {
          tabsAPI.onActivated.addListener(listener);
        }

        return () => {
          window.removeEventListener('message', handleMessage);
          try {
            tabsAPI.onCreated?.removeListener(listener);
            tabsAPI.onUpdated?.removeListener(listener);
            tabsAPI.onRemoved?.removeListener(listener);
            tabsAPI.onMoved?.removeListener(listener);
            tabsAPI.onActivated?.removeListener(listener);
          } catch (err) {
            console.warn("Failed to remove tab listeners:", err);
          }
        };
      }
    } catch (e) {
      console.warn("Failed to set up chrome tab event listeners:", e);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [refreshOpenTabs, processAndSetTabs]);

  const handleAddFromOpenTab = (tab: { title: string; url: string }) => {
    if (localBookmarks.some(b => b.url === tab.url)) return;
    const newBm = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: tab.title.replace(/^\(\d+\)\s*/, ''),
      url: tab.url,
      icon: undefined
    };
    saveLocalBookmarks([...localBookmarks, newBm]);
  };

  const [isDragOver, setIsDragOver] = useState(false);

  // Modal options
  const [searchInBm, setSearchInBm] = useState(() => {
    if (config && typeof config[`synctab_bm_search_${widgetId}`] === 'string') {
      return config[`synctab_bm_search_${widgetId}`];
    }
    return localStorage.getItem(`synctab_bm_search_${widgetId}`) || 'Disabled';
  });
  const [showCount, setShowCount] = useState(() => {
    if (config && config[`synctab_bm_show_count_${widgetId}`] !== undefined) {
      return config[`synctab_bm_show_count_${widgetId}`] === 'true' || config[`synctab_bm_show_count_${widgetId}`] === true;
    }
    const saved = localStorage.getItem(`synctab_bm_show_count_${widgetId}`);
    return saved !== null ? saved === 'true' : true;
  });
  const [appendTopSites, setAppendTopSites] = useState<'yes' | 'folder' | 'no'>(() => {
    if (config && typeof config[`synctab_bm_append_top_${widgetId}`] === 'string') {
      return config[`synctab_bm_append_top_${widgetId}`] as any;
    }
    return (localStorage.getItem(`synctab_bm_append_top_${widgetId}`) as any) || 'no';
  });
  const [appendRecent, setAppendRecent] = useState<'yes' | 'folder' | 'no'>(() => {
    if (config && typeof config[`synctab_bm_append_recent_${widgetId}`] === 'string') {
      return config[`synctab_bm_append_recent_${widgetId}`] as any;
    }
    return (localStorage.getItem(`synctab_bm_append_recent_${widgetId}`) as any) || 'no';
  });
  const [powerListTitle, setPowerListTitle] = useState(() => {
    if (config && typeof config[`synctab_bm_power_title_${widgetId}`] === 'string') {
      return config[`synctab_bm_power_title_${widgetId}`];
    }
    return localStorage.getItem(`synctab_bm_power_title_${widgetId}`) || '';
  });
  const [powerOpenNewTab, setPowerOpenNewTab] = useState(() => {
    if (config && config[`synctab_bm_power_new_tab_${widgetId}`] !== undefined) {
      return config[`synctab_bm_power_new_tab_${widgetId}`] === 'true' || config[`synctab_bm_power_new_tab_${widgetId}`] === true;
    }
    return localStorage.getItem(`synctab_bm_power_new_tab_${widgetId}`) === 'true';
  });
  const [powerAllowChangeIcons, setPowerAllowChangeIcons] = useState(() => {
    if (config && config[`synctab_bm_power_allow_change_icons_${widgetId}`] !== undefined) {
      return config[`synctab_bm_power_allow_change_icons_${widgetId}`] === 'true' || config[`synctab_bm_power_allow_change_icons_${widgetId}`] === true;
    }
    return localStorage.getItem(`synctab_bm_power_allow_change_icons_${widgetId}`) === 'true';
  });

  // For adding a new bookmark inside the modal
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('');

  // Local bookmarks storage for this specific widget instance
  const [localBookmarks, setLocalBookmarks] = useState<Array<{ id: string; title: string; url: string; icon?: string }>>(() => {
    if (config && config[`synctab_widget_bookmarks_${widgetId}`] !== undefined) {
      return config[`synctab_widget_bookmarks_${widgetId}`] || [];
    }
    try {
      const saved = localStorage.getItem(`synctab_widget_bookmarks_${widgetId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load local bookmarks:', e);
    }
    return [
      { id: 'd1', title: 'Google', url: 'https://google.com' },
      { id: 'd2', title: 'YouTube', url: 'https://youtube.com' },
      { id: 'd3', title: 'Instagram', url: 'https://instagram.com' },
      { id: 'd4', title: 'Yahoo', url: 'https://yahoo.com' },
      { id: 'd5', title: 'Wikipedia', url: 'https://wikipedia.org' },
      { id: 'd6', title: 'GitHub', url: 'https://github.com' },
    ];
  });

  // Listen to configuration updates from the database
  useEffect(() => {
    if (config) {
      if (config[`synctab_bm_mode_${widgetId}`] !== undefined) {
        const mode = config[`synctab_bm_mode_${widgetId}`];
        if (['top_sites', 'recently_closed', 'recent_top_sites'].includes(mode)) {
          setViewMode('list');
        } else {
          setViewMode(mode as any);
        }
      } else if (config.viewMode !== undefined) {
        const mode = config.viewMode;
        if (['top_sites', 'recently_closed', 'recent_top_sites'].includes(mode)) {
          setViewMode('list');
        } else {
          setViewMode(mode as any);
        }
      }
      if (config[`synctab_bm_source_${widgetId}`] !== undefined) {
        setDataSource(config[`synctab_bm_source_${widgetId}`] as any);
      }
      if (config[`synctab_bm_search_${widgetId}`] !== undefined) {
        setSearchInBm(config[`synctab_bm_search_${widgetId}`] || 'Disabled');
      }
      if (config[`synctab_bm_show_count_${widgetId}`] !== undefined) {
        setShowCount(config[`synctab_bm_show_count_${widgetId}`] === 'true' || config[`synctab_bm_show_count_${widgetId}`] === true);
      }
      if (config[`synctab_bm_append_top_${widgetId}`] !== undefined) {
        setAppendTopSites(config[`synctab_bm_append_top_${widgetId}`] || 'no');
      }
      if (config[`synctab_bm_append_recent_${widgetId}`] !== undefined) {
        setAppendRecent(config[`synctab_bm_append_recent_${widgetId}`] || 'no');
      }
      if (config[`synctab_bm_power_title_${widgetId}`] !== undefined) {
        setPowerListTitle(config[`synctab_bm_power_title_${widgetId}`] || '');
      }
      if (config[`synctab_bm_power_new_tab_${widgetId}`] !== undefined) {
        setPowerOpenNewTab(config[`synctab_bm_power_new_tab_${widgetId}`] === 'true' || config[`synctab_bm_power_new_tab_${widgetId}`] === true);
      }
      if (config[`synctab_bm_power_allow_change_icons_${widgetId}`] !== undefined) {
        setPowerAllowChangeIcons(config[`synctab_bm_power_allow_change_icons_${widgetId}`] === 'true' || config[`synctab_bm_power_allow_change_icons_${widgetId}`] === true);
      }
      if (config[`synctab_widget_bookmarks_${widgetId}`] !== undefined) {
        setLocalBookmarks(config[`synctab_widget_bookmarks_${widgetId}`] || []);
      }
      
      // Write to localStorage if key is not yet set (e.g. newly created widget from panel)
      const modeKey = `synctab_bm_mode_${widgetId}`;
      if (config.viewMode !== undefined && !localStorage.getItem(modeKey)) {
        const mode = config.viewMode;
        if (['top_sites', 'recently_closed', 'recent_top_sites'].includes(mode)) {
          localStorage.setItem(modeKey, 'list');
        } else {
          localStorage.setItem(modeKey, String(mode));
        }
        window.dispatchEvent(new Event('synctab-widgets-sync'));
      }
      const sourceKey = `synctab_bm_source_${widgetId}`;
      if (config.viewMode !== undefined && ['top_sites', 'recently_closed', 'recent_top_sites'].includes(config.viewMode) && !localStorage.getItem(sourceKey)) {
        localStorage.setItem(sourceKey, String(config.viewMode));
        window.dispatchEvent(new Event('synctab-widgets-sync'));
      }
    }
  }, [config, widgetId]);

  const saveLocalBookmarks = (newBms: Array<{ id: string; title: string; url: string; icon?: string }>) => {
    setLocalBookmarks(newBms);
    localStorage.setItem(`synctab_widget_bookmarks_${widgetId}`, JSON.stringify(newBms));
    window.dispatchEvent(new Event('synctab-widgets-sync'));
  };

  // Top sites & Recents storage
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('synctab_bm_clicks') ?? '{}'); } catch { return {}; }
  });
  const [recentSites, setRecentSites] = useState<BookmarkItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('synctab_bm_recents') ?? '[]'); } catch { return []; }
  });

  const registerClick = (item: { id: string; title: string; url: string }) => {
    const nextCounts = { ...clickCounts, [item.url]: (clickCounts[item.url] || 0) + 1 };
    setClickCounts(nextCounts);
    localStorage.setItem('synctab_bm_clicks', JSON.stringify(nextCounts));

    const filtered = recentSites.filter(x => x.url !== item.url);
    const nextRecents = [{ id: item.id, title: item.title, url: item.url }, ...filtered].slice(0, 12);
    setRecentSites(nextRecents);
    localStorage.setItem('synctab_bm_recents', JSON.stringify(nextRecents));
  };

  const getFavicon = (url: string) => {
    try { return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`; } catch { return ''; }
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const title = newTitle.trim() || getDomain(url);
    const newBm = { id: `bm-${Date.now()}`, title, url, icon: newIcon.trim() || undefined };
    saveLocalBookmarks([...localBookmarks, newBm]);
    setNewTitle('');
    setNewUrl('');
    setNewIcon('');
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    saveLocalBookmarks(localBookmarks.filter(b => b.id !== bookmarkId));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!dataStr) return;

      let parsed;
      try {
        parsed = JSON.parse(dataStr);
      } catch {
        if (dataStr.startsWith('http://') || dataStr.startsWith('https://')) {
          parsed = { title: getDomain(dataStr), url: dataStr };
        } else {
          return;
        }
      }

      const { title, url } = parsed;
      if (!url) return;

      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      const newBm = {
        id: `bm-${Date.now()}`,
        title: title?.trim() || getDomain(formattedUrl),
        url: formattedUrl,
        icon: undefined
      };
      saveLocalBookmarks([...localBookmarks, newBm]);
    } catch (err) {
      console.error('Failed to add dropped bookmark:', err);
    }
  };

  useEffect(() => {
    const handleConfig = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.widgetId === widgetId) {
        setShowSetupModal(prev => !prev);
      }
    };
    window.addEventListener(`synctab-configure-${widgetId}`, handleConfig);
    return () => window.removeEventListener(`synctab-configure-${widgetId}`, handleConfig);
  }, [widgetId]);

  const handleSave = () => {
    localStorage.setItem(`synctab_bm_mode_${widgetId}`, viewMode);
    localStorage.setItem(`synctab_bm_source_${widgetId}`, dataSource);
    localStorage.setItem(`synctab_bm_search_${widgetId}`, searchInBm);
    localStorage.setItem(`synctab_bm_show_count_${widgetId}`, String(showCount));
    localStorage.setItem(`synctab_bm_append_top_${widgetId}`, appendTopSites);
    localStorage.setItem(`synctab_bm_append_recent_${widgetId}`, appendRecent);
    localStorage.setItem(`synctab_bm_power_title_${widgetId}`, powerListTitle);
    localStorage.setItem(`synctab_bm_power_new_tab_${widgetId}`, String(powerOpenNewTab));
    localStorage.setItem(`synctab_bm_power_allow_change_icons_${widgetId}`, String(powerAllowChangeIcons));
    localStorage.setItem(`synctab_widget_bookmarks_${widgetId}`, JSON.stringify(localBookmarks));

    window.dispatchEvent(new Event('synctab-widgets-sync'));
    setShowSetupModal(false);
  };

  // Combine custom bookmarks, top sites, and recently closed depending on appends
  const getDisplayBookmarks = () => {
    if (activeFolderId === 'top_sites_folder') {
      return topSites;
    }
    if (activeFolderId === 'recent_folder') {
      return recentlyClosed.slice(0, 10);
    }

    let list = [...localBookmarks];

    if (appendTopSites === 'folder') {
      list.push({
        id: 'top_sites_folder',
        title: 'Top Sites',
        url: '#folder_top_sites',
        isFolder: true
      } as any);
    } else if (appendTopSites === 'yes') {
      list = [...list, ...topSites];
    }

    if (appendRecent === 'folder') {
      list.push({
        id: 'recent_folder',
        title: 'Recently Closed',
        url: '#folder_recent',
        isFolder: true
      } as any);
    } else if (appendRecent === 'yes') {
      list = [...list, ...recentlyClosed.slice(0, 10)];
    }

    return list;
  };

  const getActiveItems = () => {
    if (activeFolderId === 'top_sites_folder') {
      return topSites;
    }
    if (activeFolderId === 'recent_folder') {
      return recentlyClosed.slice(0, 10);
    }

    switch (dataSource) {
      case 'open_tabs':
        return openTabs;
      case 'top_sites':
        return topSites;
      case 'recently_closed':
        return recentlyClosed.slice(0, 10);
      case 'recent_top_sites':
        return recentTopSites.slice(0, 10);
      case 'custom':
      default:
        return getDisplayBookmarks();
    }
  };

  const renderIcon = (b: { id: string; title: string; url: string; icon?: string }, size = 24) => {
    if (b.icon) {
      const isUrl = /^https?:\/\//i.test(b.icon) || b.icon.startsWith('/') || b.icon.startsWith('data:');
      if (isUrl) {
        return <img src={b.icon} alt="" width={size} height={size} style={{ borderRadius: '4px', objectFit: 'cover' }} />;
      }
      return <span style={{ fontSize: `${size - 4}px` }}>{b.icon}</span>;
    }
    return <img src={getFavicon(b.url)} alt="" width={size} height={size} style={{ borderRadius: '4px' }} onError={e => {
      e.currentTarget.style.display = 'none';
    }} />;
  };

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        borderRadius: '12px',
        border: isDragOver ? '2px dashed #ecc94b' : '2px dashed transparent',
        background: isDragOver ? 'rgba(236, 201, 75, 0.08)' : 'transparent',
        padding: '6px',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box'
      }}
    >
      {/* Optional List Title / Count Header */}
      {(viewMode === 'icons' || viewMode === 'list') && !activeFolderId && (
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
          <span>
            🔖 {powerListTitle || (
              dataSource === 'open_tabs' ? 'Open Tabs' :
              dataSource === 'top_sites' ? 'Top Sites' :
              dataSource === 'recently_closed' ? 'Recently Closed' :
              'Bookmarks'
            )}
          </span>
          {showCount && <span style={{ opacity: 0.7, fontSize: '10px' }}>({getActiveItems().length})</span>}
        </div>
      )}
      
      {/* View Mode Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* 1. BOOKMARKS ICONS */}
        {viewMode === 'icons' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '4px', justifyContent: 'flex-start' }}>
            {/* Show Back Button if in a folder */}
            {activeFolderId && (
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveFolderId(null); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', width: '60px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  fontSize: '18px', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                >
                  ←
                </div>
                <span style={{ fontSize: '11px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Back</span>
              </a>
            )}

            {getActiveItems().slice(0, dataSource === 'custom' ? 11 : 12).map(b => {
              const isFolder = (b as any).isFolder;
              return (
                <a 
                  key={b.id} 
                  href={b.url} 
                  target={isFolder ? undefined : (powerOpenNewTab ? "_blank" : "_self")} 
                  rel={isFolder ? undefined : "noopener noreferrer"} 
                  onClick={(e) => {
                    if (isFolder) {
                      e.preventDefault();
                      setActiveFolderId(b.id);
                    } else {
                      registerClick(b);
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', width: '60px' }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: isFolder ? 'rgba(236, 201, 75, 0.15)' : 'rgba(255,255,255,0.18)', 
                    border: isFolder ? '1px solid rgba(236, 201, 75, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.background = isFolder ? 'rgba(236, 201, 75, 0.25)' : 'rgba(255,255,255,0.28)'; 
                    e.currentTarget.style.transform = 'scale(1.08)'; 
                    e.currentTarget.style.boxShadow = isFolder ? '0 6px 16px rgba(236, 201, 75, 0.2)' : '0 6px 16px rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.background = isFolder ? 'rgba(236, 201, 75, 0.15)' : 'rgba(255,255,255,0.18)'; 
                    e.currentTarget.style.transform = 'none'; 
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  >
                    {isFolder ? '📁' : renderIcon(b)}
                  </div>
                  <span style={{ fontSize: '11px', color: '#fff', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {isFolder ? b.title : getDomain(b.url)}
                  </span>
                </a>
              );
            })}
            
            {/* The Plus Button to open setup modal */}
            {dataSource === 'custom' && !activeFolderId && (
              <button 
                onClick={() => setShowSetupModal(true)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '60px'
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  fontSize: '18px', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                >
                  ＋
                </div>
                <span style={{ fontSize: '11px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Add</span>
              </button>
            )}
          </div>
        )}
 
        {/* 2. BOOKMARKS LIST */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searchInBm === 'Enabled' && !activeFolderId && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginBottom: '4px' }}>
                <input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search bookmarks..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Show Back Button if in a folder */}
              {activeFolderId && (
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveFolderId(null); }}
                  className="bm-list-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    ←
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500 }}>Back to Main list</span>
                  </div>
                </a>
              )}
 
              {getActiveItems()
                .filter(b => 
                  activeFolderId || 
                  b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  b.url.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(b => {
                  const isFolder = (b as any).isFolder;
                  return (
                    <div key={b.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <a 
                        href={b.url} 
                        target={isFolder ? undefined : (powerOpenNewTab ? "_blank" : "_self")} 
                        rel={isFolder ? undefined : "noopener noreferrer"} 
                        onClick={(e) => {
                          if (isFolder) {
                            e.preventDefault();
                            setActiveFolderId(b.id);
                          } else {
                            registerClick(b);
                          }
                        }}
                        className="bm-list-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s', flex: 1, minWidth: 0 }}
                      >
                        <div 
                          className="bm-list-icon-container"
                          style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: isFolder ? 'rgba(236, 201, 75, 0.15)' : 'rgba(255,255,255,0.06)', 
                            border: isFolder ? '1px solid rgba(236, 201, 75, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            transition: 'all 0.2s'
                          }}
                        >
                          {isFolder ? '📁' : renderIcon(b, 16)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{b.title}</span>
                          {!isFolder && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDomain(b.url)}</span>}
                        </div>
                      </a>
                    </div>
                  );
                })}
              {getActiveItems().length === 0 && <Msg>No matches found</Msg>}
            </div>
 
            {/* The Plus Button to open setup modal */}
            {dataSource === 'custom' && !activeFolderId && (
              <button 
                onClick={() => setShowSetupModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)',
                  borderRadius: '8px', padding: '8px 12px', color: 'rgba(255,255,255,0.5)',
                  fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                  justifyContent: 'center', marginTop: '4px', boxSizing: 'border-box'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                ＋ Add Link
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── BOOKMARKS SETUP MODAL ── */}
      {showSetupModal && createPortal(
        <div className="bm-modal-overlay" onClick={() => setShowSetupModal(false)}>
          <div className="bm-modal-container" style={{ width: '700px', height: '560px', maxHeight: 'calc(100vh - 40px)' }} onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <div className="bm-modal-title">Bookmarks Widget Settings</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }} onClick={() => setShowSetupModal(false)}>✕</div>
            </div>

            <div className="bm-modal-body">
              {/* Row 1: Data Source Tabs */}
              <div className="bm-modal-group">
                <div className="bm-modal-label">Data Source</div>
                <div className="bm-modal-tabs">
                  {[
                    { id: 'open_tabs', label: 'Open Tabs', icon: '🌐' },
                    { id: 'custom', label: 'Custom List', icon: '🔖' },
                    { id: 'top_sites', label: 'Top Sites', icon: '⭐' },
                    { id: 'recently_closed', label: 'Recents', icon: '🕒' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`bm-modal-tab-btn ${dataSource === tab.id ? 'active' : ''}`}
                      onClick={() => setDataSource(tab.id as any)}
                    >
                      <span className="bm-tab-icon">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Basic Display Controls */}
              <div className="bm-setup-card">
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div className="bm-modal-group" style={{ flex: 1, minWidth: '130px' }}>
                    <div className="bm-modal-label">List Title</div>
                    <input 
                      type="text" 
                      placeholder="e.g. My Tabs" 
                      value={powerListTitle} 
                      onChange={e => setPowerListTitle(e.target.value)}
                      className="bm-modal-input" 
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="bm-modal-group" style={{ minWidth: '120px' }}>
                    <div className="bm-modal-label">View Mode</div>
                    <div className="bm-segmented-control">
                      <button 
                        type="button" 
                        className={`bm-segmented-btn ${viewMode === 'icons' ? 'active' : ''}`}
                        onClick={() => setViewMode('icons')}
                      >
                        Grid Icons
                      </button>
                      <button 
                        type="button" 
                        className={`bm-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '4px' }}>
                  <label className="bm-modal-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={powerOpenNewTab} 
                      onChange={e => setPowerOpenNewTab(e.target.checked)} 
                    />
                    Open links in new tab
                  </label>
                  <label className="bm-modal-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={showCount} 
                      onChange={e => setShowCount(e.target.checked)} 
                    />
                    Show count badge
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="bm-modal-label" style={{ textTransform: 'none', margin: 0 }}>Search filter:</span>
                    <select 
                      value={searchInBm} 
                      onChange={e => setSearchInBm(e.target.value)}
                      className="bm-modal-select"
                      style={{ padding: '3px 8px', minWidth: '90px' }}
                    >
                      <option value="Disabled">Disabled</option>
                      <option value="Enabled">Enabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Custom Bookmark Lists (Only shown for Custom List variant) */}
              {dataSource === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                    <div className="bm-modal-group" style={{ flex: 1, minWidth: 0 }}>
                      <div className="bm-modal-label">Manage Custom Bookmarks</div>
                      <div className="bm-edit-list-container" style={{ minWidth: 'auto', height: '160px', maxHeight: '160px' }}>
                        {localBookmarks.map(b => (
                          <div key={b.id} className="bm-edit-item">
                            <div className="bm-edit-item-info">
                              <img src={getFavicon(b.url)} alt="" width={14} height={14} />
                              <span style={{ fontWeight: 600 }}>{b.title}</span>
                              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>({getDomain(b.url)})</span>
                            </div>
                            <button 
                              className="bm-edit-delete-btn" 
                              onClick={() => handleDeleteBookmark(b.id)}
                              title="Delete Bookmark"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {localBookmarks.length === 0 && (
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: 8, textAlign: 'center', marginTop: '40px' }}>No custom bookmarks. Add one below.</div>
                        )}
                      </div>
                    </div>

                    <div className="bm-modal-group" style={{ flex: 1, minWidth: 0 }}>
                      <div className="bm-modal-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>Quick Add from Open Tabs</span>
                        <span style={{ fontSize: '9px', background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', padding: '2px 6px', borderRadius: '10px', fontWeight: 'normal' }}>{openTabs.length} Tabs Open</span>
                      </div>
                      <div className="bm-edit-list-container" style={{ minWidth: 'auto', height: '160px', maxHeight: '160px', background: 'rgba(255,255,255,0.01)' }}>
                        {openTabs.map((tab, idx) => {
                          const isAdded = localBookmarks.some(b => b.url === tab.url);
                          return (
                            <div 
                              key={idx} 
                              className="bm-edit-item" 
                              style={{ 
                                cursor: isAdded ? 'default' : 'pointer', 
                                opacity: isAdded ? 0.6 : 1,
                                transition: 'all 0.15s ease',
                                padding: '6px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.02)'
                              }}
                              onClick={() => !isAdded && handleAddFromOpenTab(tab)}
                              title={isAdded ? "Already added" : "Click to add as bookmark icon"}
                            >
                              <div className="bm-edit-item-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', overflow: 'hidden' }}>
                                <img src={getFavicon(tab.url)} alt="" width={14} height={14} style={{ borderRadius: '4px', flexShrink: 0 }} />
                                <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{tab.title}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{new URL(tab.url).hostname}</span>
                              </div>
                              <button 
                                className="bm-edit-add-btn" 
                                style={{ 
                                  background: isAdded ? 'transparent' : 'rgba(236, 201, 75, 0.15)', 
                                  border: 'none', 
                                  color: isAdded ? '#10b981' : '#ecc94b', 
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: isAdded ? 'default' : 'pointer'
                                }}
                              >
                                {isAdded ? '✓ Added' : '＋ Add'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Add Bookmark Form */}
                  <form onSubmit={handleAddBookmark} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="bm-modal-group" style={{ flex: 1.2 }}>
                      <div className="bm-modal-label" style={{ fontSize: '9px' }}>Link Title (Optional)</div>
                      <input 
                        type="text" 
                        placeholder="e.g. My Website" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        className="bm-modal-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="bm-modal-group" style={{ flex: 2 }}>
                      <div className="bm-modal-label" style={{ fontSize: '9px' }}>URL</div>
                      <input 
                        type="text" 
                        placeholder="example.com" 
                        value={newUrl} 
                        onChange={e => setNewUrl(e.target.value)}
                        required
                        className="bm-modal-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    {powerAllowChangeIcons && (
                      <div className="bm-modal-group" style={{ flex: 1 }}>
                        <div className="bm-modal-label" style={{ fontSize: '9px' }}>Icon (Emoji/URL)</div>
                        <input 
                          type="text" 
                          placeholder="e.g. ⭐ or URL" 
                          value={newIcon} 
                          onChange={e => setNewIcon(e.target.value)}
                          className="bm-modal-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                    <button type="submit" className="bm-modal-btn-primary" style={{ height: '32px' }}>
                      Add Link
                    </button>
                  </form>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label className="bm-modal-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={powerAllowChangeIcons} 
                        onChange={e => setPowerAllowChangeIcons(e.target.checked)} 
                      />
                      Allow custom emojis/icons for bookmarks
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="bm-modal-footer">
              <button className="bm-modal-btn-secondary" onClick={() => setShowSetupModal(false)}>CANCEL</button>
              <button className="bm-modal-btn-primary" onClick={handleSave}>SAVE CONFIGURATION</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const CountdownWidget: React.FC<{ widgetId: string; config?: Record<string, any> }> = ({ widgetId, config }) => {
  const key = `synctab_countdown_${widgetId}`;
  const [targetStr, setTargetStr] = useState(() => {
    if (config && config[key] !== undefined) {
      return config[key];
    }
    return localStorage.getItem(key) ?? `${new Date().getFullYear() + 1}-01-01T00:00`;
  });
  const [title, setTitle] = useState(() => {
    if (config && config[`${key}_title`] !== undefined) {
      return config[`${key}_title`];
    }
    return localStorage.getItem(`${key}_title`) ?? 'New Year';
  });
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (config) {
      if (config[key] !== undefined) {
        setTargetStr(config[key]);
      }
      if (config[`${key}_title`] !== undefined) {
        setTitle(config[`${key}_title`]);
      }
    }
  }, [config, key]);

  useEffect(() => {
    const updateTime = () => {
      const diff = +new Date(targetStr) - +new Date();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, [targetStr]);

  const saveConfig = (newTitle: string, newDate: string) => {
    setTitle(newTitle);
    setTargetStr(newDate);
    localStorage.setItem(`${key}_title`, newTitle);
    localStorage.setItem(key, newDate);
    window.dispatchEvent(new Event('synctab-widgets-sync'));
    setIsConfiguring(false);
  };

  useEffect(() => {
    const handleConfig = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.widgetId === widgetId) {
        setIsConfiguring(prev => !prev);
      }
    };
    window.addEventListener(`synctab-configure-${widgetId}`, handleConfig);
    return () => window.removeEventListener(`synctab-configure-${widgetId}`, handleConfig);
  }, [widgetId]);

  if (isConfiguring) {
    return (
      <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, fontSize: '11px', justifyContent: 'center' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Configure Countdown</div>
        <input 
          defaultValue={title} 
          placeholder="Event Title" 
          id={`title-${widgetId}`}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#fff', outline: 'none' }}
        />
        <input 
          type="datetime-local"
          defaultValue={targetStr}
          id={`date-${widgetId}`}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#fff', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button 
            onClick={() => {
              const tInput = document.getElementById(`title-${widgetId}`) as HTMLInputElement;
              const dInput = document.getElementById(`date-${widgetId}`) as HTMLInputElement;
              saveConfig(tInput.value || 'Countdown', dInput.value || targetStr);
            }} 
            style={{ background: 'var(--primary)', border: 'none', borderRadius: '4px', color: '#fff', padding: '4px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', flex: 1 }}
          >
            Save
          </button>
          <button onClick={() => setIsConfiguring(false)} style={{ background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-secondary)', padding: '4px 10px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 6, padding: '0 4px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>⏳ {title}</span>
        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => setIsConfiguring(true)}>⚙️</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        {[
          { label: 'Days', val: timeLeft.days },
          { label: 'Hrs', val: timeLeft.hours },
          { label: 'Min', val: timeLeft.minutes },
          { label: 'Sec', val: timeLeft.seconds },
        ].map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '6px 2px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{String(item.val).padStart(2, '0')}</span>
            <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 1 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== STOCKS ====================
interface StockItem { symbol: string; name: string; price: number; change: number; changePercent: number; }

export const StocksWidget: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.45, change: 1.24, changePercent: 0.7 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 135.80, change: -0.45, changePercent: -0.33 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 242.68, change: 5.12, changePercent: 2.15 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 330.22, change: 0.98, changePercent: 0.30 },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      setStocks(prev => prev.map(s => {
        const pct = (Math.random() - 0.5) * 0.4; // max +-0.2% change per tick
        const diff = s.price * (pct / 100);
        const nextPrice = +(s.price + diff).toFixed(2);
        const nextChange = +(s.change + diff).toFixed(2);
        const nextPercent = +(nextChange / (nextPrice - nextChange) * 100).toFixed(2);
        return { ...s, price: nextPrice, change: nextChange, changePercent: nextPercent };
      }));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.8px' }}>📈 Markets & Stocks</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {stocks.map(s => {
          const isUp = s.change >= 0;
          return (
            <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--panel-border)', fontSize: '11px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.symbol}</span>
                <span style={{ fontSize: '8px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${s.price.toFixed(2)}</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: isUp ? '#10b981' : '#ef4444' }}>
                  {isUp ? '▲' : '▼'} {Math.abs(s.changePercent)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== HELPER ====================
const Msg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>{children}</div>
);
