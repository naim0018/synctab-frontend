import React, { useState } from 'react';
import { Plus, X, FolderOpen, Edit2, Check } from 'lucide-react';
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
      className={`bg-slate-900/30 border border-white/5 rounded-xl flex flex-col h-full min-w-[280px] flex-shrink-0 select-none overflow-hidden transition-colors duration-200 ${isDraggingOver ? 'bg-slate-900/50 border-indigo-500/30' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { handleColumnHeaderDrop(e, colName); handleDrawerTabDrop(e, colName); }}
    >
      <div 
        className="p-4 flex items-center justify-between border-b border-white/5 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify({ 
            source: 'column-reorder', 
            colName 
          }));
        }}
      >
        <div className="flex items-center gap-2">
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
                className="bg-slate-950 border border-white/5 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/50 w-[120px]"
                autoFocus
                required
              />
              <button 
                className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameColumn(colName);
                }}
              >
                <Check size={12} />
              </button>
              <button 
                className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
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
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{colName}</span>
              <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-medium">{list.length}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 relative">
          <button 
            className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
            onClick={(e) => {
              e.stopPropagation();
              setOpenColMenu(openColMenu === colName ? null : colName);
            }}
            title="Open All Options"
            onDragStart={(e) => e.stopPropagation()}
          >
            <FolderOpen size={14} />
          </button>
          {editingColName !== colName && (
            <button 
              className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
              onClick={(e) => {
                e.stopPropagation();
                setEditingColName(colName);
                setEditingColTempName(colName);
              }}
              title="Rename Column"
              onDragStart={(e) => e.stopPropagation()}
            >
              <Edit2 size={14} />
            </button>
          )}
          <button 
            className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
            onClick={() => setIsAdding(!isAdding)}
            title="Add Link"
            onDragStart={(e) => e.stopPropagation()}
          >
            <Plus size={14} />
          </button>
          {selectedSpaceId !== currentSyncSpaceId && (
            <button 
              className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-all" 
              onClick={() => handleDeleteColumn(colName)}
              title="Delete Column"
              onDragStart={(e) => e.stopPropagation()}
            >
              <X size={14} />
            </button>
          )}

          {/* Column Dropdown Menu */}
          {openColMenu === colName && (
            <div className="absolute right-0 top-6 bg-slate-950 border border-white/10 rounded-lg p-1.5 shadow-xl min-w-[170px] z-50 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
              <button 
                className="w-full text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 p-2 rounded transition-colors cursor-pointer"
                onClick={() => {
                  openAllBookmarks(colName, false);
                  setOpenColMenu(null);
                }}
              >
                Open all in new tabs
              </button>
              <button 
                className="w-full text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 p-2 rounded transition-colors cursor-pointer"
                onClick={() => {
                  openAllBookmarks(colName, true);
                  setOpenColMenu(null);
                }}
              >
                Open all in a new window
              </button>
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
