import React from 'react';
import { RefreshCw, X } from 'lucide-react';

interface RecentTabsProps {
  openTabs: Array<{ id: string; title: string; url: string }>;
  refreshOpenTabs: () => void;
  onClose?: () => void;
}

const getFavicon = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
  } catch {
    return '';
  }
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export const RecentTabs: React.FC<RecentTabsProps> = ({
  openTabs,
  refreshOpenTabs,
  onClose
}) => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: 'var(--bm-sidebar-bg)' }}>
      <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--bm-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--bm-text-main)' }}>Open Tabs</span>
          <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--bm-text-sub)' }}>{openTabs.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            className="bg-transparent border-none text-slate-400 hover:text-indigo-500 cursor-pointer p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
            onClick={refreshOpenTabs}
            title="Refresh open tabs"
          >
            <RefreshCw size={13} />
          </button>
          {onClose && (
            <button 
              className="bg-transparent border-none text-slate-400 hover:text-indigo-500 cursor-pointer p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
              onClick={onClose}
              title="Close drawer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {openTabs.map(tab => (
          <div 
            key={tab.id}
            className="flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer mb-2"
            style={{
              background: 'var(--bm-card-bg)',
              border: 'var(--bm-card-border)',
              boxShadow: 'var(--bm-card-shadow)'
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({ 
                title: tab.title, 
                url: tab.url, 
                source: 'drawer' 
              }));
            }}
            onClick={() => window.open(tab.url, '_blank')}
          >
            <img 
              src={getFavicon(tab.url)} 
              alt="" 
              width={14} 
              height={14}
              style={{ borderRadius: '3px' }}
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--bm-text-main)' }}>{tab.title}</span>
              <span className="text-[10px] truncate mt-0.5" style={{ color: 'var(--bm-text-sub)' }}>{getDomain(tab.url)}</span>
            </div>
          </div>
        ))}
        {openTabs.length === 0 && (
          <div className="text-xs text-center py-8" style={{ color: 'var(--bm-text-sub)' }}>No open tabs found</div>
        )}
      </div>
    </div>
  );
};
export default RecentTabs;
