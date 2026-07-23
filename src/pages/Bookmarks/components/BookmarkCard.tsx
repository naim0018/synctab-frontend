import React from 'react';
import { Trash2 } from 'lucide-react';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  clicks: number;
  isShared: boolean;
  userId: string;
}

interface BookmarkCardProps {
  bookmark: BookmarkItem;
  cardIdx: number;
  colName: string;
  isDragged: boolean;
  showIndicatorBefore: boolean;
  ghostVisible: boolean;
  onPointerDown: (id: string, colName: string, title: string, e: React.PointerEvent<HTMLElement>) => void;
  onDeleteBookmark: (id: string, e: React.MouseEvent) => void;
}

const ACCENT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow/orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

const getAccentColor = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ACCENT_COLORS.length;
  return ACCENT_COLORS[index];
};

const getFavicon = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
  } catch {
    return '';
  }
};

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  colName,
  isDragged,
  showIndicatorBefore,
  ghostVisible,
  onPointerDown,
  onDeleteBookmark
}) => {
  const accentColor = getAccentColor(bookmark.title || bookmark.url);

  return (
    <>
      {showIndicatorBefore && (
        <div className="h-0.5 w-full bg-indigo-500 rounded my-1 animate-pulse" />
      )}
      <div
        data-card-id={bookmark.id}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer relative group/card mb-2 ${isDragged ? 'opacity-30 border-dashed border-indigo-500/50' : ''}`}
        style={{
          background: 'var(--bm-card-bg)',
          border: 'var(--bm-card-border)',
          borderLeft: `3px solid ${accentColor}`,
          boxShadow: 'var(--bm-card-shadow)',
        }}
        onClick={() => !ghostVisible && window.open(bookmark.url, '_blank')}
        onPointerDown={e => onPointerDown(bookmark.id, colName, bookmark.title, e)}
      >
        <div className="w-[14px] h-[14px] flex items-center justify-center flex-shrink-0">
          <img
            src={getFavicon(bookmark.url)}
            alt=""
            width={14}
            height={14}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <span 
          className="text-xs font-semibold truncate flex-1 pr-6"
          style={{ color: 'var(--bm-text-main)' }}
        >
          {bookmark.title}
        </span>
        <button
          className="absolute right-2.5 opacity-0 group-hover/card:opacity-100 bg-transparent border-none text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 rounded transition-all hover:bg-black/5 dark:hover:bg-white/5"
          onClick={e => onDeleteBookmark(bookmark.id, e)}
          title="Delete Bookmark"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </>
  );
};
export default BookmarkCard;
