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
  Move
} from 'lucide-react';

interface SidebarMenuProps {
  side: 'left' | 'right';
  menuItems: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isWidgetEditing: boolean;
  setIsWidgetEditing: (editing: boolean) => void;
  isWidgetPanelOpen: boolean;
  setIsWidgetPanelOpen: (open: boolean) => void;
  draggingOverSide: 'left' | 'right' | null;
  setDraggingOverSide: (side: 'left' | 'right' | null) => void;
  customPages: { id: string; name: string }[];
  visibleTabs: {
    bookmarks: boolean;
    notes: boolean;
    tasks: boolean;
    reminders: boolean;
    chat: boolean;
  };
  handleMenuDragStart: (e: React.DragEvent, id: string) => void;
  handleSidebarDrop: (e: React.DragEvent, side: 'left' | 'right') => void;
  handleMenuDropOnItem: (e: React.DragEvent, targetId: string, targetSide: 'left' | 'right') => void;
  setIsCustomPageModalOpen?: (open: boolean) => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  side,
  menuItems,
  activeTab,
  setActiveTab,
  isWidgetEditing,
  setIsWidgetEditing,
  isWidgetPanelOpen,
  setIsWidgetPanelOpen,
  draggingOverSide,
  setDraggingOverSide,
  customPages,
  visibleTabs,
  handleMenuDragStart,
  handleSidebarDrop,
  handleMenuDropOnItem,
  setIsCustomPageModalOpen
}) => {
  const getMenuItemDetails = (id: string) => {
    if (id.startsWith('page_')) {
      const page = customPages.find(p => p.id === id);
      if (!page) return null;
      return {
        label: page.name,
        icon: <Plus size={20} />,
        visible: true,
      };
    }

    switch (id) {
      case 'dashboard':
        return { label: 'Home', icon: <Globe size={20} />, visible: true };
      case 'bookmarks':
        return { label: 'Bookmarks', icon: <BookmarkIcon size={20} />, visible: visibleTabs.bookmarks };
      case 'notes':
        return { label: 'Notes', icon: <FileText size={20} />, visible: visibleTabs.notes };
      case 'customize':
        return { label: 'Customize', icon: <Plus size={20} />, visible: true };
      case 'widgets':
        return { label: 'Widgets', icon: <Grid size={20} />, visible: true };
      case 'edit_widgets':
        return { label: 'Edit Layout', icon: <Move size={20} />, visible: true };
      case 'tasks':
        return { label: 'Tasks', icon: <CheckSquare size={20} />, visible: visibleTabs.tasks };
      case 'reminders':
        return { label: 'Reminders', icon: <Clock size={20} />, visible: visibleTabs.reminders };
      case 'chat':
        return { label: 'Chat', icon: <MessageSquare size={20} />, visible: visibleTabs.chat };
      case 'issues':
        return { label: 'Issues', icon: <span style={{ fontSize: 18 }}>🐛</span>, visible: true };
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
      <div
        key={id}
        className="edge-menu-item-wrapper"
        draggable
        onDragStart={(e) => handleMenuDragStart(e, id)}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => handleMenuDropOnItem(e, id, side)}
        style={{ cursor: 'grab' }}
      >
        <button
          onClick={onClick}
          className={`edge-menu-btn ${isActive ? 'active' : ''}`}
          title={label}
        >
          {icon}
        </button>
        <span className="edge-menu-label" style={{ maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`edge-menu ${side}-side ${draggingOverSide === side ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDraggingOverSide(side); }}
      onDragLeave={() => setDraggingOverSide(null)}
      onDrop={(e) => handleSidebarDrop(e, side)}
    >
      <div className="edge-menu-items-inner">
        {menuItems.map((id) => {
          const details = getMenuItemDetails(id);
          if (!details || !details.visible) return null;
          return renderMenuItem(id, details.label, details.icon);
        })}

        {side === 'left' && setIsCustomPageModalOpen && (
          <div className="edge-menu-item-wrapper">
            <button
              onClick={() => setIsCustomPageModalOpen(true)}
              className="edge-menu-btn"
              style={{ borderStyle: 'dashed', background: 'rgba(255, 255, 255, 0.03)' }}
              title="Create Custom Page"
            >
              <Plus size={20} />
            </button>
            <span className="edge-menu-label">Add Page</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default SidebarMenu;
