import React, { useState, useEffect } from 'react';

// ==================== CLOCK ====================
export const ClockWidget: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
      <div style={{ fontSize: 'clamp(1.4rem, 4vw, 2.4rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: 'clamp(9px, 1.5vw, 11px)', color: 'var(--text-secondary)', textAlign: 'center' }}>
        {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
export const SearchWidget: React.FC = () => {
  const [q, setQ] = useState('');
  const [engine, setEngine] = useState<'google' | 'bing'>('google');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const url = engine === 'google'
      ? `https://www.google.com/search?q=${encodeURIComponent(q)}`
      : `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setQ('');
  };
  return (
    <form onSubmit={submit} style={{ display: 'flex', height: '100%', alignItems: 'center', gap: 6 }}>
      <select value={engine} onChange={e => setEngine(e.target.value as 'google' | 'bing')}
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '4px 6px', fontSize: '11px', outline: 'none', cursor: 'pointer' }}>
        <option value="google">G</option>
        <option value="bing">B</option>
      </select>
      <div style={{ flex: 1, display: 'flex', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '28px', alignItems: 'center', padding: '0 14px', gap: 8 }}>
        <span style={{ fontSize: '13px', opacity: 0.5 }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', padding: '7px 0' }} />
      </div>
      {q && <button type="submit" style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>→</button>}
    </form>
  );
};

// ==================== NOTES ====================
export const NotesWidget: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const key = `synctab_wn_${widgetId}`;
  const [text, setText] = useState(() => localStorage.getItem(key) ?? '');
  const save = (v: string) => { setText(v); localStorage.setItem(key, v); };
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
}> = ({ widgetId }) => {
  const [viewMode, setViewMode] = useState<'icons' | 'list'>(() => {
    const saved = localStorage.getItem(`synctab_bm_mode_${widgetId}`);
    return saved === 'list' ? 'list' : 'icons';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal options (mocked for visual fidelity with the reference image)
  const [searchInBm, setSearchInBm] = useState('Disabled');
  const [showCount, setShowCount] = useState(true);
  const [appendTopSites, setAppendTopSites] = useState<'yes' | 'folder' | 'no'>('no');
  const [appendRecent, setAppendRecent] = useState<'yes' | 'folder' | 'no'>('no');
  const [powerListTitle, setPowerListTitle] = useState('');
  const [powerOpenNewTab, setPowerOpenNewTab] = useState(false);
  const [powerAllowChangeIcons, setPowerAllowChangeIcons] = useState(false);

  // For adding a new bookmark inside the modal
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Local bookmarks storage for this specific widget instance
  const [localBookmarks, setLocalBookmarks] = useState<Array<{ id: string; title: string; url: string }>>(() => {
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

  const saveLocalBookmarks = (newBms: Array<{ id: string; title: string; url: string }>) => {
    setLocalBookmarks(newBms);
    localStorage.setItem(`synctab_widget_bookmarks_${widgetId}`, JSON.stringify(newBms));
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
    const nextRecents = [{ id: item.id, title: item.title, url: item.url, category: 'Work', isShared: false, userId: '' }, ...filtered].slice(0, 12);
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
    const newBm = { id: `bm-${Date.now()}`, title, url };
    saveLocalBookmarks([...localBookmarks, newBm]);
    setNewTitle('');
    setNewUrl('');
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

  // Filtered bookmarks for list search
  const filteredBookmarks = localBookmarks.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    localStorage.setItem(`synctab_bm_mode_${widgetId}`, viewMode);
    setShowSetupModal(false);
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
      
      {/* View Mode Content */}
      <div style={{ overflow: 'visible' }}>
        
        {/* 1. BOOKMARKS ICONS */}
        {viewMode === 'icons' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '4px', justifyContent: 'flex-start' }}>
            {localBookmarks.slice(0, 11).map(b => (
              <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" onClick={() => registerClick(b)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', width: '60px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; 
                  e.currentTarget.style.transform = 'scale(1.08)'; 
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; 
                  e.currentTarget.style.transform = 'none'; 
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                >
                  <img src={getFavicon(b.url)} alt="" width={24} height={24} style={{ borderRadius: '4px' }} onError={e => {
                    e.currentTarget.style.display = 'none';
                  }} />
                </div>
                <span style={{ fontSize: '11px', color: '#fff', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {getDomain(b.url)}
                </span>
              </a>
            ))}
            
            {/* The Plus Button to open setup modal */}
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
          </div>
        )}

        {/* 2. BOOKMARKS LIST */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searchInBm === 'Enabled' && (
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
              {filteredBookmarks.map(b => (
                <div key={b.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" onClick={() => registerClick(b)}
                    className="bm-list-row"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s', flex: 1, minWidth: 0 }}
                  >
                    <div 
                      className="bm-list-icon-container"
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'all 0.2s'
                      }}
                    >
                      <img src={getFavicon(b.url)} alt="" width={16} height={16} style={{ borderRadius: '3px' }} onError={e => {
                        e.currentTarget.style.display = 'none';
                      }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{b.title}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDomain(b.url)}</span>
                    </div>
                  </a>
                </div>
              ))}
              {filteredBookmarks.length === 0 && <Msg>No matches found</Msg>}
            </div>

            {/* The Plus Button to open setup modal */}
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
          </div>
        )}
      </div>

      {/* ── BOOKMARKS SETUP MODAL ── */}
      {showSetupModal && (
        <div className="bm-modal-overlay" onClick={() => setShowSetupModal(false)}>
          <div className="bm-modal-container" onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <div className="bm-modal-title">Bookmarks setup | visual | on click</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px' }} onClick={() => setShowSetupModal(false)}>✕</div>
            </div>

            <div className="bm-modal-body">
              {/* Row 1: View Mode & Search */}
              <div className="bm-modal-row">
                <div className="bm-modal-group">
                  <div className="bm-modal-label">View as</div>
                  <div className="bm-modal-options">
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="viewAs" 
                        checked={viewMode === 'icons'} 
                        onChange={() => setViewMode('icons')} 
                      />
                      Icons
                    </label>
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="viewAs" 
                        checked={viewMode === 'list'} 
                        onChange={() => setViewMode('list')} 
                      />
                      List
                    </label>
                  </div>
                </div>

                <div className="bm-modal-group">
                  <div className="bm-modal-label">Searching in Bookmarks</div>
                  <select 
                    value={searchInBm} 
                    onChange={e => setSearchInBm(e.target.value)}
                    className="bm-modal-select"
                  >
                    <option value="Disabled">Disabled</option>
                    <option value="Enabled">Enabled</option>
                  </select>
                </div>

                <div className="bm-modal-group" style={{ justifyContent: 'flex-end', height: '42px' }}>
                  <label className="bm-modal-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={showCount} 
                      onChange={e => setShowCount(e.target.checked)} 
                    />
                    Show Number of Bookmarks
                  </label>
                </div>
              </div>

              {/* Row 2: Manage/Edit Bookmarks */}
              <div className="bm-modal-group">
                <div className="bm-modal-label">Edit Bookmarks</div>
                <div className="bm-edit-list-container">
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
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: 8, textAlign: 'center' }}>No custom bookmarks. Add one below.</div>
                  )}
                </div>
              </div>

              {/* Row 3: Add Bookmark Form */}
              <form onSubmit={handleAddBookmark} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="bm-modal-group" style={{ flex: 1 }}>
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
                <button type="submit" className="bm-modal-btn-primary" style={{ height: '32px' }}>
                  Add Link
                </button>
              </form>

              {/* Row 4: Appends & Integrations */}
              <div className="bm-modal-row">
                <div className="bm-modal-group">
                  <div className="bm-modal-label">Append Chrome Top Sites</div>
                  <div className="bm-modal-options">
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="topSites" 
                        checked={appendTopSites === 'yes'} 
                        onChange={() => setAppendTopSites('yes')} 
                      />
                      Yes
                    </label>
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="topSites" 
                        checked={appendTopSites === 'folder'} 
                        onChange={() => setAppendTopSites('folder')} 
                      />
                      Folder
                    </label>
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="topSites" 
                        checked={appendTopSites === 'no'} 
                        onChange={() => setAppendTopSites('no')} 
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className="bm-modal-group">
                  <div className="bm-modal-label">Append Recently Closed</div>
                  <div className="bm-modal-options">
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="recentClosed" 
                        checked={appendRecent === 'yes'} 
                        onChange={() => setAppendRecent('yes')} 
                      />
                      Yes
                    </label>
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="recentClosed" 
                        checked={appendRecent === 'folder'} 
                        onChange={() => setAppendRecent('folder')} 
                      />
                      Folder
                    </label>
                    <label className="bm-modal-radio-label">
                      <input 
                        type="radio" 
                        name="recentClosed" 
                        checked={appendRecent === 'no'} 
                        onChange={() => setAppendRecent('no')} 
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 5: Power Features */}
              <div className="bm-power-features">
                <div className="bm-power-header">
                  ⚡ Power features <span style={{ cursor: 'pointer', opacity: 0.8 }}>ⓘ</span>
                </div>
                <div className="bm-modal-row" style={{ gap: 20 }}>
                  <div className="bm-modal-group">
                    <div className="bm-modal-label" style={{ fontSize: '9px' }}>List Title</div>
                    <input 
                      type="text" 
                      placeholder="List Title" 
                      value={powerListTitle} 
                      onChange={e => setPowerListTitle(e.target.value)}
                      className="bm-modal-input" 
                    />
                  </div>
                  <label className="bm-modal-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={powerOpenNewTab} 
                      onChange={e => setPowerOpenNewTab(e.target.checked)} 
                    />
                    Open all bookmarks in new tab
                  </label>
                  <label className="bm-modal-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={powerAllowChangeIcons} 
                      onChange={e => setPowerAllowChangeIcons(e.target.checked)} 
                    />
                    Allow to change icons
                  </label>
                </div>
              </div>
            </div>

            <div className="bm-modal-footer">
              <button className="bm-modal-btn-secondary" onClick={() => setShowSetupModal(false)}>CANCEL</button>
              <button className="bm-modal-btn-secondary" onClick={handleSave}>SAVE</button>
              <button className="bm-modal-btn-primary" onClick={handleSave}>SAVE & RUN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CountdownWidget: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const key = `synctab_countdown_${widgetId}`;
  const [targetStr, setTargetStr] = useState(() => {
    return localStorage.getItem(key) ?? `${new Date().getFullYear() + 1}-01-01T00:00`;
  });
  const [title, setTitle] = useState(() => {
    return localStorage.getItem(`${key}_title`) ?? 'New Year';
  });
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isConfiguring, setIsConfiguring] = useState(false);

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
