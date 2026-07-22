import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RecentTabsProps {
  openTabs: Array<{ id: string; title: string; url: string }>;
  refreshOpenTabs: () => void;
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
  refreshOpenTabs
}) => {
  return (
    <div className="bg-slate-900/30 border border-white/5 rounded-xl flex flex-col h-full min-w-[280px] flex-shrink-0 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Open tabs</span>
          <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-medium">{openTabs.length}</span>
        </div>
        <div className="flex items-center">
          <button 
            className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
            onClick={refreshOpenTabs}
            title="Refresh open tabs"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {openTabs.map(tab => (
          <div 
            key={tab.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/2 border border-white/[0.03] hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer mb-2.5"
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
              <span className="text-xs font-medium text-slate-200 truncate">{tab.title}</span>
              <span className="text-[10px] text-slate-500 truncate mt-0.5">{getDomain(tab.url)}</span>
            </div>
          </div>
        ))}
        {openTabs.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-8">No open tabs found</div>
        )}
      </div>
    </div>
  );
};
export default RecentTabs;
