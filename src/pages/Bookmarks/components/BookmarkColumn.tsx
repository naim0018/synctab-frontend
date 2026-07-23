import React, { useState } from 'react';
import { Plus, X, FolderOpen, Check } from 'lucide-react';
import BookmarkCard from './BookmarkCard';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  clicks: number;
  isShared: boolean;
  userId: string;
}

interface DragState {
  draggedId: string | null;
  overColName: string | null;
  overIndex: number | null;
}

interface BookmarkColumnProps {
  colName: string;
  list: BookmarkItem[];
  isAdding: boolean;
  setIsAdding: (adding: boolean) => void;
  isDraggingOver: boolean;
  dragState: DragState;
  selectedSpaceId: string;
  currentSyncSpaceId: string;
  openColMenu: string | null;
  setOpenColMenu: (colName: string | null) => void;
  editingColName: string | null;
  setEditingColName: (colName: string | null) => void;
  editingColTempName: string;
  setEditingColTempName: (name: string) => void;
  handleRenameColumn: (colName: string) => void;
  handleDeleteColumn: (colName: string) => void;
  openAllBookmarks: (colName: string, inNewWindow: boolean) => void;
  handleColumnHeaderDrop: (e: React.DragEvent, colName: string) => void;
  handleDrawerTabDrop: (e: React.DragEvent, colName: string) => void;
  handleAddBookmarkSubmit: (colName: string, title: string, url: string) => void;
  ghost: { visible: boolean; title: string };
  onPointerDown: (id: string, colName: string, title: string, e: React.PointerEvent<HTMLElement>) => void;
  onDeleteBookmark: (id: string, e: React.MouseEvent) => void;
}

export const BookmarkColumn: React.FC<BookmarkColumnProps> = ({
  colName,
  list,
  isAdding,
  setIsAdding,
  isDraggingOver,
  dragState,
  selectedSpaceId,
  currentSyncSpaceId,
  openColMenu,
  setOpenColMenu,
  editingColName,
  setEditingColName,
  editingColTempName,
  setEditingColTempName,
  handleRenameColumn,
  handleDeleteColumn,
  openAllBookmarks,
  handleColumnHeaderDrop,
  handleDrawerTabDrop,
  handleAddBookmarkSubmit,
  ghost,
  onPointerDown,
  onDeleteBookmark
}) => {
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardUrl, setNewCardUrl] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardUrl.trim()) return;
    handleAddBookmarkSubmit(colName, newCardTitle, newCardUrl);
    setNewCardTitle('');
    setNewCardUrl('');
  };

  return (
    <div 
      id={`col-${colName}`}
      data-col-drop-zone={colName}
      className={`flex flex-col h-full min-w-[240px] max-w-[240px] flex-shrink-0 select-none overflow-hidden transition-all duration-200 rounded-xl ${isDraggingOver ? 'bg-black/5 dark:bg-white/5 border border-dashed border-indigo-500/20' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { handleColumnHeaderDrop(e, colName); handleDrawerTabDrop(e, colName); }}
    >
      <div 
        className="p-3 flex items-center justify-between cursor-grab active:cursor-grabbing group/col-header relative"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify({ 
            source: 'column-reorder', 
            colName 
          }));
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {editingColName === colName ? (
            <div 
              className="flex items-center gap-1" 
              onClick={e => e.stopPropagation()} 
              onDragStart={e => e.stopPropagation()}
            >
              <input 
                type="text" 
                value={editingColTempName} 
                onChange={e => setEditingColTempName(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500/50 w-[120px]"
                autoFocus
                required
              />
              <button 
                className="bg-transparent border-none text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameColumn(colName);
                }}
              >
                <Check size={12} />
              </button>
              <button 
                className="bg-transparent border-none text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingColName(null);
                }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <span className="text-[13px] font-bold truncate" style={{ color: 'var(--bm-text-main)' }}>
                {colName}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--bm-text-sub)' }}>
                {list.length}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5 relative opacity-0 group-hover/col-header:opacity-100 transition-opacity duration-150" onDragStart={e => e.stopPropagation()}>
          <button 
            className="bg-transparent border-none text-slate-400 hover:text-indigo-500 cursor-pointer p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
            onClick={(e) => {
              e.stopPropagation();
              openAllBookmarks(colName, false);
            }}
            title="Open all in new tabs"
          >
            <FolderOpen size={12} />
          </button>
          
          <button 
            className="bg-transparent border-none text-slate-400 hover:text-indigo-500 cursor-pointer p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
            onClick={(e) => {
              e.stopPropagation();
              setIsAdding(!isAdding);
            }}
            title="Add Link"
          >
            <Plus size={12} />
          </button>

          <button 
            className="bg-transparent border-none text-slate-400 hover:text-indigo-500 cursor-pointer p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all" 
            onClick={(e) => {
              e.stopPropagation();
              setOpenColMenu(openColMenu === colName ? null : colName);
            }}
            title="More Options"
          >
            <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'inline-block', transform: 'translateY(-1px)' }}>⋮</span>
          </button>

          {/* Column Dropdown Menu */}
          {openColMenu === colName && (
            <div className="absolute right-0 top-6 bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-lg p-1 shadow-xl min-w-[150px] z-50 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
              {editingColName !== colName && (
                <button 
                  className="w-full text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingColName(colName);
                    setEditingColTempName(colName);
                    setOpenColMenu(null);
                  }}
                >
                  Rename Column
                </button>
              )}
              <button 
                className="w-full text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded transition-colors cursor-pointer"
                onClick={() => {
                  openAllBookmarks(colName, true);
                  setOpenColMenu(null);
                }}
              >
                Open all in new window
              </button>
              {selectedSpaceId !== currentSyncSpaceId && (
                <button 
                  className="w-full text-left text-xs text-rose-500 hover:bg-rose-500/10 p-1.5 rounded transition-colors cursor-pointer"
                  onClick={() => {
                    handleDeleteColumn(colName);
                    setOpenColMenu(null);
                  }}
                >
                  Delete Column
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {/* Inline Add Card Form */}
        {isAdding && (
          <form onSubmit={onSubmit} className="p-3 bg-white/2 border border-white/[0.03] rounded-lg mb-3 flex flex-col gap-2">
            <input 
              type="text" 
              placeholder="Link Title (Optional)" 
              value={newCardTitle} 
              onChange={e => setNewCardTitle(e.target.value)}
              className="bg-slate-950 border border-white/5 rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 w-full"
            />
            <input 
              type="text" 
              placeholder="example.com" 
              value={newCardUrl} 
              onChange={e => setNewCardUrl(e.target.value)}
              required
              className="bg-slate-950 border border-white/5 rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 w-full"
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button 
                type="button" 
                className="p-1 px-3.5 rounded text-xs cursor-pointer transition-all flex items-center justify-center border font-semibold bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button type="submit" className="p-1 px-3.5 rounded text-xs cursor-pointer transition-all flex items-center justify-center border font-semibold bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700">
                Add
              </button>
            </div>
          </form>
        )}

        {list.map((b, cardIdx) => {
          const isCardDragged = dragState.draggedId === b.id;
          const showIndicatorBefore = dragState.overColName === colName && dragState.overIndex === cardIdx;

          return (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              cardIdx={cardIdx}
              colName={colName}
              isDragged={isCardDragged}
              showIndicatorBefore={showIndicatorBefore}
              ghostVisible={ghost.visible}
              onPointerDown={onPointerDown}
              onDeleteBookmark={onDeleteBookmark}
            />
          );
        })}

        {/* Indicator at end of list */}
        {dragState.overColName === colName && dragState.overIndex === list.length && (
          <div className="h-0.5 w-full bg-indigo-500 rounded my-1 animate-pulse" />
        )}

        {list.length === 0 && !isAdding && dragState.overColName !== colName && (
          <div className="text-xs text-slate-600 text-center py-8 border border-dashed border-white/[0.02] rounded-lg">Drag tabs here or click + to add links</div>
        )}
      </div>
    </div>
  );
};
export default BookmarkColumn;
