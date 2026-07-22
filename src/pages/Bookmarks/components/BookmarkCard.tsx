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

const getFavicon = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
  } catch {
    return '';
  }
};

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  cardIdx,
  colName,
  isDragged,
  showIndicatorBefore,
  ghostVisible,
  onPointerDown,
  onDeleteBookmark
}) => {
  return (
    <>
      {showIndicatorBefore && (
        <div className="h-0.5 w-full bg-indigo-500 rounded my-1 animate-pulse" />
      )}
      <div
        data-card-id={bookmark.id}
        className={`flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer relative group/card mb-2 ${isDragged ? 'opacity-30 border-dashed border-indigo-500/50' : ''}`}
        onClick={() => !ghostVisible && window.open(bookmark.url, '_blank')}
        onPointerDown={e => onPointerDown(bookmark.id, colName, bookmark.title, e)}
      >
        <span className="text-[10px] font-bold text-slate-500 min-w-[18px] text-right flex-shrink-0 leading-[14px]">{cardIdx + 1}</span>
        <div className="w-[14px] h-[14px] flex items-center justify-center flex-shrink-0">
          <img
            src={getFavicon(bookmark.url)}
            alt=""
            width={14}
            height={14}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <span className="text-xs font-medium text-slate-200 truncate flex-1 pr-6">{bookmark.title}</span>
        <button
          className="absolute right-2.5 opacity-0 group-hover/card:opacity-100 bg-transparent border-none text-slate-500 hover:text-rose-400 cursor-pointer p-0.5 rounded transition-all hover:bg-white/5"
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
