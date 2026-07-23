import { useState, useMemo } from 'react';
import { Bookmark as BookmarkIcon } from 'lucide-react';
import BookmarkModal from './components/common/BookmarkModal';
import CustomPageModal from './components/common/CustomPageModal';
import { SidebarMenu } from './components/common/SidebarMenu';

// Decomposed page containers
import AuthPage from './pages/Auth/AuthPage';
import DashboardPage from './pages/Dashboard/DashboardPage';

import NotesPage from './pages/Notes/NotesPage';
import TasksPage from './pages/Tasks/TasksPage';
import RemindersPage from './pages/Reminders/RemindersPage';
import ChatPage from './pages/Chat/ChatPage';
import CustomizePage from './pages/Customize/CustomizePage';

import { useSyncTabState } from './hooks/useSyncTabState';
import BookmarksPage from './pages/Bookmarks/BookmarksPage';
import IssuePage from './pages/Issue/IssuePage';

function App() {
  const state = useSyncTabState();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const combinedMenuItems = useMemo(() => {
    // Keep 'dashboard' at the top, then bookmarks, notes, tasks, reminders, chat, issues, customize, widgets, edit_widgets.
    // Let's filter customPages or others out, or keep them if they are in the list.
    const all = [...state.leftMenuItems, ...state.rightMenuItems];
    const unique = Array.from(new Set(all));
    
    // Sort or order logically so it looks beautiful
    const order = ['dashboard', 'bookmarks', 'notes', 'tasks', 'reminders', 'chat', 'issues', 'customize', 'widgets', 'edit_widgets'];
    return unique.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [state.leftMenuItems, state.rightMenuItems]);

  const {
    activeTab,
    setActiveTab,
    isDarkMode,
    setIsDarkMode,
    isOnline,
    loading,
    customPages,
    isCustomPageModalOpen,
    setIsCustomPageModalOpen,
    isWidgetEditing,
    setIsWidgetEditing,
    isWidgetPanelOpen,
    setIsWidgetPanelOpen,
    currentWallpaper,
    setCurrentWallpaper,
    wallpapers,
    customGreeting,
    accentColor,
    handleUpdateAccentColor,
    blurIntensity,
    handleUpdateBlurIntensity,
    clockFormat24h,
    handleUpdateClockFormat,
    isUploading,
    uploadError,
    visibleTabs,
    handleToggleTab,
    users,
    currentUser,
    setCurrentUser,
    notes,
    selectedNote,
    setSelectedNote,
    bookmarks,
    tasks,
    reminders,
    isBookmarkModalOpen,
    setIsBookmarkModalOpen,
    noteSavingStatus,
    setNoteSavingStatus,
    authError,
    setAuthError,
    authLoading,
    profileSaving,
    profileSaveMsg,
    linkedAccounts,
    linkingGoogle,
    linkGoogleMsg,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    handleOfflineDemoLogin,
    handleSaveProfile,
    handleLinkGoogleViaPopup,
    handleLinkGoogleByEmail,
    handleUnlinkGoogleAccount,
    handleStatusChange,
    handleCreateBookmark,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleCreateTask,
    handleTaskStatusMove,
    handleDeleteTask,
    handleCreateReminder,
    handleToggleReminder,
    handleDeleteReminder,
    handleDeleteCustomPage,
    fetchBookmarks,
    handleDeleteCustomWallpaper,
    handleUploadWallpaper,
    handleAddWallpaperUrl
  } = state;

  if (loading) {
    return (
      <div className="auth-screen-container">
        <div className="auth-card" style={{ maxWidth: '320px', alignItems: 'center', textAlign: 'center' }}>
          <div className="auth-logo-icon">
            <BookmarkIcon size={24} />
          </div>
          <h2 className="auth-title">SyncTab</h2>
          <p className="auth-subtitle">Loading workspace...</p>
          <div className="loading-spinner" style={{ border: '2px solid rgba(255,255,255,0.05)', borderTop: '2px solid var(--primary)', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite', marginTop: '10px' }} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLoginDirect={(user) => {
          localStorage.setItem('synctab_user', JSON.stringify(user));
          setCurrentUser(user);
          // Load all data for the newly authenticated user using methods from state hook
          if ('fetchNotes' in state && typeof state.fetchNotes === 'function') {
            (state as any).fetchNotes(user);
          }
          fetchBookmarks(user);
          if ('fetchTasks' in state && typeof state.fetchTasks === 'function') {
            (state as any).fetchTasks();
          }
          if ('fetchCustomWallpapers' in state && typeof state.fetchCustomWallpapers === 'function') {
            (state as any).fetchCustomWallpapers(user);
          }
        }}
        onAuthError={(msg) => setAuthError(msg)}
        onOfflineDemoLogin={handleOfflineDemoLogin}
        isOnline={isOnline}
        loading={authLoading}
        authError={authError}
      />
    );
  }

  return (
    <div className={`app-container app-root ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Redesigned Single Left Sidebar */}
      <SidebarMenu
        menuItems={combinedMenuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWidgetEditing={isWidgetEditing}
        setIsWidgetEditing={setIsWidgetEditing}
        isWidgetPanelOpen={isWidgetPanelOpen}
        setIsWidgetPanelOpen={setIsWidgetPanelOpen}
        customPages={customPages}
        visibleTabs={visibleTabs}
        setIsCustomPageModalOpen={setIsCustomPageModalOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        currentUser={currentUser}
        handleStatusChange={handleStatusChange}
        handleLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      {/* Main content area */}
      <main className={`main-content ${activeTab === 'dashboard' || customPages.some(p => p.id === activeTab) ? 'dashboard-mode' : ''}`}>

        <>
          {/* A. DASHBOARD / CUSTOM PAGES VIEW */}
          {(activeTab === 'dashboard' || customPages.some(p => p.id === activeTab)) && (
            <DashboardPage
              activeTab={activeTab}
              customPages={customPages}
              onDeleteCustomPage={handleDeleteCustomPage}
              tasks={tasks}
              bookmarks={bookmarks}
              isWidgetEditing={isWidgetEditing}
              setIsWidgetEditing={setIsWidgetEditing}
              isWidgetPanelOpen={isWidgetPanelOpen}
              setIsWidgetPanelOpen={setIsWidgetPanelOpen}
              currentUser={currentUser}
            />
          )}

          {/* B. DETAILED BOOKMARKS VIEW */}
          {activeTab === 'bookmarks' && (
            <BookmarksPage
              bookmarks={bookmarks}
              onRefresh={() => fetchBookmarks()}
            />
          )}

          {/* B2. ISSUE TRACKER */}
          {activeTab === 'issues' && (
            <div style={{ height: '100%', width: '100%', display: 'flex' }}>
              <IssuePage />
            </div>
          )}

          {/* C. DETAILED NOTES VIEW */}
          {activeTab === 'notes' && (
            <NotesPage
              notes={notes}
              selectedNote={selectedNote}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              noteSavingStatus={noteSavingStatus}
              setNoteSavingStatus={setNoteSavingStatus}
              setSelectedNote={setSelectedNote}
            />
          )}

          {/* D. DETAILED TASK KANBAN VIEW */}
          {activeTab === 'tasks' && (
            <TasksPage
              tasks={tasks}
              users={users}
              onStatusMove={handleTaskStatusMove}
              onDeleteTask={handleDeleteTask}
              onCreateTask={handleCreateTask}
            />
          )}

          {/* E. DETAILED REMINDERS VIEW */}
          {activeTab === 'reminders' && (
            <RemindersPage
              reminders={reminders}
              onCreateReminder={handleCreateReminder}
              onToggleReminder={handleToggleReminder}
              onDeleteReminder={handleDeleteReminder}
            />
          )}

          {/* F. DETAILED CHAT VIEW */}
          {activeTab === 'chat' && (
            <ChatPage />
          )}

          {/* G. DETAILED CUSTOMIZE VIEW */}
          {activeTab === 'customize' && (
            <CustomizePage
              currentUser={currentUser}
              onSaveProfile={handleSaveProfile}
              isOnline={isOnline}
              profileSaving={profileSaving}
              profileSaveMsg={profileSaveMsg}
              onLogout={handleLogout}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              accentColor={accentColor}
              onUpdateAccentColor={handleUpdateAccentColor}
              blurIntensity={blurIntensity}
              onUpdateBlurIntensity={handleUpdateBlurIntensity}
              clockFormat24h={clockFormat24h}
              onUpdateClockFormat={handleUpdateClockFormat}
              customGreeting={customGreeting}
              onUpdateCustomGreeting={('setCustomGreeting' in state) ? (state as any).setCustomGreeting : () => {}}
              visibleTabs={visibleTabs}
              onToggleTab={handleToggleTab}
              linkedAccounts={linkedAccounts}
              onUnlinkAccount={handleUnlinkGoogleAccount}
              onLinkViaPopup={handleLinkGoogleViaPopup}
              onLinkByEmail={handleLinkGoogleByEmail}
              linkingGoogle={linkingGoogle}
              linkGoogleMsg={linkGoogleMsg}
              wallpapers={wallpapers}
              currentWallpaper={currentWallpaper}
              onSelectWallpaper={setCurrentWallpaper}
              onDeleteWallpaper={handleDeleteCustomWallpaper}
              onUploadWallpaper={handleUploadWallpaper}
              isUploading={isUploading}
              uploadError={uploadError}
              onAddWallpaperUrl={handleAddWallpaperUrl}
            />
          )}
        </>
      </main>

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
        onSubmit={handleCreateBookmark}
      />

      {/* Custom Page Creation Modal */}
      <CustomPageModal
        isOpen={isCustomPageModalOpen}
        onClose={() => setIsCustomPageModalOpen(false)}
        onCreate={(name) => {
          const newId = `page_${Date.now()}`;
          const newPages = [...customPages, { id: newId, name }];
          state.setCustomPages(newPages);
          state.setLeftMenuItems(prev => {
            const next = [...prev, newId];
            localStorage.setItem('synctab-left-menu-items', JSON.stringify(next));
            const settingsStr = JSON.stringify({ left: next, right: state.rightMenuItems });
            state.saveThemeSettings({ sidebarSettings: settingsStr });
            return next;
          });
          setActiveTab(newId);
          setIsCustomPageModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;
