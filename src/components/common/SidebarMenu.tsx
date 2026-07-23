import React from 'react';
import {
  Bookmark as BookmarkIcon,
  Plus,
  FileText,
  CheckSquare,
  MessageSquare,
  Clock,
  Globe,
  Grid,
  Move,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';
import type { User } from '../../types';

interface SidebarMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isWidgetEditing: boolean;
  setIsWidgetEditing: (editing: boolean) => void;
  isWidgetPanelOpen: boolean;
  setIsWidgetPanelOpen: (open: boolean) => void;
  customPages: { id: string; name: string }[];
  visibleTabs: {
    bookmarks: boolean;
    notes: boolean;
    tasks: boolean;
    reminders: boolean;
    chat: boolean;
  };
  setIsCustomPageModalOpen?: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  menuItems: string[];
  currentUser: User | null;
  handleStatusChange: (status: string) => Promise<void>;
  handleLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  activeTab,
  setActiveTab,
  isWidgetEditing,
  setIsWidgetEditing,
  isWidgetPanelOpen,
  setIsWidgetPanelOpen,
  customPages,
  visibleTabs,
  setIsCustomPageModalOpen,
  isCollapsed,
  setIsCollapsed,
  menuItems,
  currentUser,
  handleStatusChange,
  handleLogout,
  isDarkMode,
  setIsDarkMode,
}) => {
  const getMenuItemDetails = (id: string) => {
    if (id.startsWith('page_')) {
      const page = customPages.find(p => p.id === id);
      if (!page) return null;
      return {
        label: page.name,
        icon: <Plus size={18} />,
        visible: true,
      };
    }

    switch (id) {
      case 'dashboard':
        return { label: 'Dashboard', icon: <Globe size={18} />, visible: true };
      case 'bookmarks':
        return { label: 'Bookmarks', icon: <BookmarkIcon size={18} />, visible: visibleTabs.bookmarks };
      case 'notes':
        return { label: 'Notes', icon: <FileText size={18} />, visible: visibleTabs.notes };
      case 'customize':
        return { label: 'Customize', icon: <Settings size={18} />, visible: true };
      case 'widgets':
        return { label: 'Widgets', icon: <Grid size={18} />, visible: true };
      case 'edit_widgets':
        return { label: 'Edit Layout', icon: <Move size={18} />, visible: true };
      case 'tasks':
        return { label: 'Tasks', icon: <CheckSquare size={18} />, visible: visibleTabs.tasks };
      case 'reminders':
        return { label: 'Reminders', icon: <Clock size={18} />, visible: visibleTabs.reminders };
      case 'chat':
        return { label: 'Chat', icon: <MessageSquare size={18} />, visible: visibleTabs.chat };
      case 'issues':
        return { label: 'Issues', icon: <span style={{ fontSize: 16 }}>🐛</span>, visible: true };
      default:
        return null;
    }
  };

  const renderMenuItem = (id: string, label: string, icon: React.ReactNode) => {
    const isWidgets = id === 'widgets';
    const isEditWidgets = id === 'edit_widgets';
    const isActive = isWidgets
      ? isWidgetPanelOpen
      : isEditWidgets
        ? isWidgetEditing
        : activeTab === id;

    const onClick = () => {
      if (isWidgets) {
        if (activeTab !== 'dashboard' && !activeTab.startsWith('page_')) {
          setActiveTab('dashboard');
        }
        const nextPanelOpen = !isWidgetPanelOpen;
        setIsWidgetPanelOpen(nextPanelOpen);
        if (nextPanelOpen) {
          setIsWidgetEditing(true);
        }
      } else if (isEditWidgets) {
        if (activeTab !== 'dashboard' && !activeTab.startsWith('page_')) {
          setActiveTab('dashboard');
        }
        const nextEditing = !isWidgetEditing;
        setIsWidgetEditing(nextEditing);
        if (!nextEditing) {
          setIsWidgetPanelOpen(false);
        }
      } else {
        setActiveTab(id);
        setIsWidgetEditing(false);
        setIsWidgetPanelOpen(false);
      }
    };

    return (
      <button
        key={id}
        onClick={onClick}
        className={`sidebar-menu-btn ${isActive ? 'active' : ''}`}
        title={isCollapsed ? label : undefined}
      >
        <span className="sidebar-menu-icon">{icon}</span>
        {!isCollapsed && <span className="sidebar-menu-label">{label}</span>}
      </button>
    );
  };

  const [showPromo, setShowPromo] = React.useState(true);

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand / Logo */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Sparkles size={20} className="brand-logo-spark" />
        </div>
        {!isCollapsed && <span className="brand-title">SyncTab</span>}
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav-list">
        {menuItems.map((id) => {
          const details = getMenuItemDetails(id);
          if (!details || !details.visible) return null;
          return renderMenuItem(id, details.label, details.icon);
        })}

        {setIsCustomPageModalOpen && (
          <button
            onClick={() => setIsCustomPageModalOpen(true)}
            className="sidebar-menu-btn add-page-btn"
            title={isCollapsed ? "Add Custom Page" : undefined}
          >
            <span className="sidebar-menu-icon">
              <Plus size={18} />
            </span>
            {!isCollapsed && <span className="sidebar-menu-label">Add Page</span>}
          </button>
        )}
      </nav>

      {/* Promo Card ("Upgrade to Pro") */}
      {!isCollapsed && showPromo && (
        <div className="promo-card">
          <button className="promo-close-btn" onClick={() => setShowPromo(false)}>
            <X size={14} />
          </button>
          <div className="promo-badge">
            <Zap size={14} />
          </div>
          <h4 className="promo-title">Upgrade to Pro!</h4>
          <p className="promo-desc">Full financial insights with analytics and graphs.</p>
          <button className="promo-action-btn">Upgrade now</button>
        </div>
      )}

      {/* Footer Actions */}
      <div className="sidebar-footer-actions">
        {currentUser && (
          <div className="sidebar-profile-wrapper">
            <ProfileDropdown
              currentUser={currentUser}
              handleStatusChange={handleStatusChange}
              handleLogout={handleLogout}
            />
          </div>
        )}

        <div className="sidebar-utility-row">
          {/* Notification Button */}
          <button className="sidebar-action-btn notification-btn" title="Notifications">
            <span className="notification-icon-dot" />
            <Bell size={18} />
          </button>
          
          {/* Theme Toggle Button */}
          <button className="sidebar-action-btn theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Add Widget Button if on Dashboard */}
          {(activeTab === 'dashboard' || customPages.some(p => p.id === activeTab)) && (
            <button 
              className="sidebar-action-btn add-widget-sidebar-btn"
              onClick={() => {
                const nextPanel = !isWidgetPanelOpen;
                setIsWidgetPanelOpen(nextPanel);
                if (nextPanel) setIsWidgetEditing(true);
              }}
              title="Add Widget"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse Toggle at Bottom */}
      <button
        className="sidebar-collapse-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        {!isCollapsed && <span className="toggle-label">Collapse sidebar</span>}
      </button>
    </aside>
  );
};

export default SidebarMenu;
