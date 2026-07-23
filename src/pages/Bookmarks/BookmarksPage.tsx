import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Share2, RefreshCw } from 'lucide-react';
import RecentTabs from './components/RecentTabs';
import BookmarkColumn from './components/BookmarkColumn';
import CustomConfirmModal from './components/CustomConfirmModal';
import { useBookmarksManager, type BookmarksManager, type BookmarkItem } from './hooks/useBookmarksManager';
import './BookmarksPage.css';

interface BookmarksPageProps {
  bookmarks: BookmarkItem[];
  onRefresh: () => void;
  manager?: BookmarksManager;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ bookmarks: backendBookmarks, onRefresh, manager: propManager }) => {
  const internalManager = useBookmarksManager({ bookmarks: backendBookmarks, onRefresh });
  const manager = propManager || internalManager;

  const {
    selectedSpaceId,
    spaces,
    activeSpace,
    currentSyncSpaceId,
    isSyncing,
    pendingSyncBms,
    openTabs,
    refreshOpenTabs,
    isTabsDrawerOpen,
    setIsTabsDrawerOpen,
    showAddForm,
    setShowAddForm,
    dragSort,
    columnBookmarks,
    activeColumns,
    openColMenu,
    setOpenColMenu,
    modalConfig,
    handleSetCurrentBrowserSyncSpace,
    handleSyncBrowser,
    handleSaveSyncToDatabase,
    handleSyncCloudOnly,
    handleAddColumn,
    handleRenameColumn,
    handleDeleteColumn,
    openAllBookmarks,
    handleColumnHeaderDrop,
    handleDrawerTabDrop,
    handleAddBookmarkSubmit,
    handleDeleteBookmark
  } = manager;

  const { dragState, ghost, onPointerDown } = dragSort;

  return (
    <div className="bm-mgr-container">
      {/* Ghost drag element */}
      {ghost.visible && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] opacity-90 shadow-2xl"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: `${ghost.width}px`,
            height: `${ghost.height}px`,
            transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 w-full" style={{ margin: 0 }}>
            <span className="truncate flex-1">{ghost.title}</span>
          </div>
        </div>,
        document.body
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bm-main-bg)' }}>
        <div className="h-16 flex items-center justify-between px-6 border-b flex-shrink-0 bg-transparent" style={{ borderColor: 'var(--bm-border)' }}>
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: 'var(--bm-text-main)' }}>
              <span>{spaces.find((s: any) => s.id === selectedSpaceId)?.icon || '📁'}</span>
              <span>{spaces.find((s: any) => s.id === selectedSpaceId)?.name || selectedSpaceId}</span>
            </div>
            {activeSpace?.isSyncSpace && (
              selectedSpaceId === currentSyncSpaceId ? (
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium px-2 py-0.5 rounded-full" title="This space is designated to sync with this browser's bookmarks">
                  ✓ Local Sync Active
                </span>
              ) : (
                <button 
                  className="text-[10px] bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-white font-medium px-2 py-0.5 rounded-full transition-all cursor-pointer" 
                  onClick={handleSetCurrentBrowserSyncSpace}
                  title="Click to designate this space to sync with this browser's bookmarks"
                >
                  Set as Local Sync
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {selectedSpaceId === currentSyncSpaceId ? (
              <>
                <button 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${isSyncing ? 'animate-pulse' : ''}`} 
                  onClick={handleSyncBrowser}
                  disabled={isSyncing}
                  title="Synchronize browser bookmarks with SyncTab database"
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync with Browser'}</span>
                </button>
                <button 
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    pendingSyncBms 
                      ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 animate-pulse' 
                      : 'bg-transparent border-black/10 dark:border-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                  onClick={handleSaveSyncToDatabase}
                  disabled={isSyncing || !pendingSyncBms}
                  title={pendingSyncBms ? "Save locally synced browser changes to backend database" : "No pending browser sync changes to save"}
                >
                  <span>Save to Database</span>
                  {pendingSyncBms && <span className="w-1.5 h-1.5 bg-white rounded-full ml-0.5 animate-ping"></span>}
                </button>
              </>
            ) : activeSpace?.isSyncSpace ? (
              <button 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${isSyncing ? 'animate-pulse' : ''}`} 
                onClick={handleSyncCloudOnly}
                disabled={isSyncing}
                title="Fetch latest bookmarks from backend"
              >
                <RefreshCw size={13} className={isSyncing ? 'spin animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>
            ) : null}
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer">
              <Share2 size={13} /> Share
            </button>
            <button 
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
              onClick={() => setIsTabsDrawerOpen(true)}
            >
              Open tabs <span className="bg-black/5 dark:bg-white/10 px-1.5 py-0.2 rounded text-[10px] font-bold ml-1">{openTabs.length}</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold transition-all cursor-pointer bg-indigo-600 border border-indigo-500 hover:bg-indigo-700" onClick={handleAddColumn}>
              <Plus size={13} /> Add Column
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex gap-5 p-6 overflow-x-auto overflow-y-hidden items-start select-none bg-transparent" style={{ userSelect: ghost.visible ? 'none' : undefined }}>
          {activeColumns.map(colName => {
            const isAdding = showAddForm[colName] || false;
            const list = (columnBookmarks[colName] || []).filter(b => b.id !== dragState.draggedId);
            const isDraggingOver = dragState.overColName === colName;

            return (
              <BookmarkColumn
                key={colName}
                colName={colName}
                list={list}
                isAdding={isAdding}
                setIsAdding={(adding) => setShowAddForm(prev => ({ ...prev, [colName]: adding }))}
                isDraggingOver={isDraggingOver}
                dragState={dragState}
                selectedSpaceId={selectedSpaceId}
                currentSyncSpaceId={currentSyncSpaceId}
                openColMenu={openColMenu}
                setOpenColMenu={setOpenColMenu}
                editingColName={null} 
                setEditingColName={() => {}}
                editingColTempName=""
                setEditingColTempName={() => {}}
                handleRenameColumn={(name) => handleRenameColumn(colName, name)}
                handleDeleteColumn={handleDeleteColumn}
                openAllBookmarks={openAllBookmarks}
                handleColumnHeaderDrop={handleColumnHeaderDrop}
                handleDrawerTabDrop={handleDrawerTabDrop}
                handleAddBookmarkSubmit={handleAddBookmarkSubmit}
                ghost={ghost}
                onPointerDown={onPointerDown}
                onDeleteBookmark={handleDeleteBookmark}
              />
            );
          })}
        </div>
      </div>

      {/* Open Tabs Drawer Overlay */}
      {isTabsDrawerOpen && (
        <div className="bm-mgr-drawer-overlay" onClick={() => setIsTabsDrawerOpen(false)}>
          <div className="bm-mgr-drawer-content" onClick={e => e.stopPropagation()}>
            <RecentTabs 
              openTabs={openTabs} 
              refreshOpenTabs={refreshOpenTabs} 
              onClose={() => setIsTabsDrawerOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* REUSABLE CUSTOM MODAL */}
      <CustomConfirmModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        defaultValue={modalConfig.defaultValue}
        placeholder={modalConfig.placeholder}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />
    </div>
  );
};

export default BookmarksPage;
