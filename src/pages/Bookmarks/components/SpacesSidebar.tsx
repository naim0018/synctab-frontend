import React, { useState } from 'react';
import { 
  Plus, Search, X, ChevronLeft, ChevronRight, ChevronDown, Trash2, Edit2, Check 
} from 'lucide-react';

interface Space {
  id: string;
  name: string;
  icon: string;
  isSyncSpace?: boolean;
}

interface SpacesSidebarProps {
  spaces: Space[];
  selectedSpaceId: string;
  onSelectSpace: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  bookmarks: any[];
  getActiveColumnsForSpace: (spaceId: string) => string[];
  onCreateSpace: (name: string, icon: string) => void;
  onRenameSpace: (id: string, name: string, icon: string) => void;
  onDeleteSpace: (id: string) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onDeleteColumn: (name: string) => void;
  onCategoryClick: (spaceId: string, colName: string) => void;
}

const parseCategory = (category: string): [string, string] => {
  if (category.includes('/')) {
    const parts = category.split('/');
    return [parts[0], parts.slice(1).join('/')];
  }
  return ['Personal', category || 'General'];
};

export const SpacesSidebar: React.FC<SpacesSidebarProps> = ({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  searchQuery,
  setSearchQuery,
  bookmarks,
  getActiveColumnsForSpace,
  onCreateSpace,
  onRenameSpace,
  onDeleteSpace,
  onRenameColumn,
  onDeleteColumn,
  onCategoryClick
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() => {
    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    const syncSpaceId = `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return { [syncSpaceId]: true };
  });

  const [showAddSpaceInline, setShowAddSpaceInline] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceIcon, setNewSpaceIcon] = useState('📁');

  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingSpaceName, setEditingSpaceName] = useState('');
  const [editingSpaceIcon, setEditingSpaceIcon] = useState('');

  const [editingColName, setEditingColName] = useState<string | null>(null);
  const [editingColTempName, setEditingColTempName] = useState('');

  const handleCreateSpaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    onCreateSpace(newSpaceName.trim(), newSpaceIcon.trim());
    setNewSpaceName('');
    setNewSpaceIcon('📁');
    setShowAddSpaceInline(false);
  };

  const handleSaveSpaceClick = (id: string) => {
    if (!editingSpaceName.trim()) return;
    onRenameSpace(id, editingSpaceName.trim(), editingSpaceIcon.trim());
    setEditingSpaceId(null);
  };

  const handleRenameColumnClick = (oldName: string) => {
    if (!editingColTempName.trim()) return;
    onRenameColumn(oldName, editingColTempName.trim());
    setEditingColName(null);
  };

  const toggleSpaceExpand = (e: React.MouseEvent, spaceId: string) => {
    e.stopPropagation();
    setExpandedSpaces(prev => ({
      ...prev,
      [spaceId]: !prev[spaceId]
    }));
  };

  return (
    <div className={`bm-mgr-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="bm-mgr-sidebar-header">
        <span className="bm-mgr-brand">SyncTab</span>
        <button 
          className="bm-mgr-collapse-btn" 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="bm-mgr-search-box">
        <div className="bm-mgr-search-input-wrapper">
          <Search className="bm-mgr-search-icon" size={14} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bm-mgr-search-input"
          />
        </div>
      </div>

      <div className="bm-mgr-sections">
        <div className="bm-mgr-sidebar-section">
          <div className="bm-mgr-section-title-row">
            <span className="bm-mgr-section-title">Spaces</span>
            <button 
              className="bm-mgr-section-add-btn" 
              onClick={() => setShowAddSpaceInline(!showAddSpaceInline)} 
              title="Add Space"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Inline Add Space Form */}
            {showAddSpaceInline && (
              <form onSubmit={handleCreateSpaceSubmit} className="bm-mgr-sidebar-inline-form">
                <div className="bm-mgr-sidebar-inline-row">
                  <input 
                    type="text" 
                    placeholder="Icon" 
                    value={newSpaceIcon} 
                    onChange={e => setNewSpaceIcon(e.target.value)}
                    style={{ width: '40px', textAlign: 'center' }}
                    className="bm-mgr-inline-input"
                  />
                  <input 
                    type="text" 
                    placeholder="Space Name" 
                    value={newSpaceName} 
                    onChange={e => setNewSpaceName(e.target.value)}
                    style={{ flex: 1 }}
                    required
                    className="bm-mgr-inline-input"
                    autoFocus
                  />
                </div>
                <div className="bm-mgr-inline-actions">
                  <button 
                    type="button" 
                    className="bm-mgr-inline-btn bm-mgr-inline-btn-cancel"
                    onClick={() => setShowAddSpaceInline(false)}
                  >
                    <X size={10} />
                  </button>
                  <button type="submit" className="bm-mgr-inline-btn bm-mgr-inline-btn-submit">
                    <Check size={10} />
                  </button>
                </div>
              </form>
            )}

            {spaces.map((space: any) => {
              const isEditing = editingSpaceId === space.id;
              const isSelected = selectedSpaceId === space.id;

              return (
                <div key={space.id} className="bm-mgr-space-item-wrapper">
                  {isEditing ? (
                    <div className="bm-mgr-sidebar-inline-form" style={{ margin: '2px 4px' }}>
                      <div className="bm-mgr-sidebar-inline-row">
                        <input 
                          type="text" 
                          value={editingSpaceIcon} 
                          onChange={e => setEditingSpaceIcon(e.target.value)}
                          style={{ width: '40px', textAlign: 'center' }}
                          className="bm-mgr-inline-input"
                        />
                        <input 
                          type="text" 
                          value={editingSpaceName} 
                          onChange={e => setEditingSpaceName(e.target.value)}
                          style={{ flex: 1 }}
                          required
                          className="bm-mgr-inline-input"
                          autoFocus
                        />
                      </div>
                      <div className="bm-mgr-inline-actions">
                        <button 
                          type="button" 
                          className="bm-mgr-inline-btn bm-mgr-inline-btn-cancel"
                          onClick={() => setEditingSpaceId(null)}
                        >
                          <X size={10} />
                        </button>
                        <button 
                          type="button" 
                          className="bm-mgr-inline-btn bm-mgr-inline-btn-submit"
                          onClick={() => handleSaveSpaceClick(space.id)}
                        >
                          <Check size={10} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`bm-mgr-space-item ${isSelected ? 'active' : ''}`}
                      onClick={() => onSelectSpace(space.id)}
                    >
                      {!isSidebarCollapsed && (
                        <span 
                          className="bm-mgr-space-chevron"
                          onClick={(e) => toggleSpaceExpand(e, space.id)}
                          style={{ marginRight: '4px', display: 'inline-flex', alignItems: 'center', opacity: isSelected ? 0.8 : 0.4 }}
                        >
                          {expandedSpaces[space.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                      )}
                      <span style={{ fontSize: '15px' }}>{space.icon}</span>
                      <span className="bm-mgr-space-name">{space.name}</span>
                      {!isSidebarCollapsed && (
                        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1px 6px', minWidth: '18px', textAlign: 'center', flexShrink: 0 }}>
                          {bookmarks.filter(b => { const [sp] = parseCategory(b.category); return sp === space.id; }).length}
                        </span>
                      )}
                      
                      {/* Space Actions (Edit / Delete) */}
                      {!isSidebarCollapsed && (
                        <div className="bm-mgr-space-actions">
                          {!space.isSyncSpace && (
                            <>
                              <button 
                                className="bm-mgr-icon-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSpaceId(space.id);
                                  setEditingSpaceName(space.name);
                                  setEditingSpaceIcon(space.icon);
                                }}
                                title="Edit Space"
                              >
                                <Edit2 size={10} />
                              </button>
                              <button 
                                className="bm-mgr-icon-btn" 
                                style={{ color: '#f87171' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSpace(space.id);
                                }}
                                title="Delete Space"
                              >
                                <Trash2 size={10} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category sub-list when expanded */}
                  {!isSidebarCollapsed && !!expandedSpaces[space.id] && (
                    <div className="bm-mgr-subcategories">
                      {getActiveColumnsForSpace(space.id).map((colName, colIdx) => {
                        const isColEditing = editingColName === colName && selectedSpaceId === space.id;

                        return (
                          <div key={colName} className="bm-mgr-subcat-wrapper">
                            {isColEditing ? (
                              <div className="bm-mgr-sidebar-inline-form" style={{ margin: '2px 8px' }}>
                                <div className="bm-mgr-sidebar-inline-row">
                                  <input 
                                    type="text" 
                                    value={editingColTempName} 
                                    onChange={e => setEditingColTempName(e.target.value)}
                                    className="bm-mgr-inline-input"
                                    style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                                    autoFocus
                                    required
                                  />
                                </div>
                                <div className="bm-mgr-inline-actions">
                                  <button 
                                    type="button" 
                                    className="bm-mgr-inline-btn bm-mgr-inline-btn-cancel"
                                    onClick={() => setEditingColName(null)}
                                  >
                                    <X size={10} />
                                  </button>
                                  <button 
                                    type="button" 
                                    className="bm-mgr-inline-btn bm-mgr-inline-btn-submit"
                                    onClick={() => handleRenameColumnClick(colName)}
                                  >
                                    <Check size={10} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="bm-mgr-subcat-item"
                                onClick={() => onCategoryClick(space.id, colName)}
                              >
                                <span style={{ opacity: 0.35, marginRight: '4px', fontSize: '11px' }}>{colIdx + 1}.</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {colName}
                                </span>
                                <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1px 5px' }}>
                                  {bookmarks.filter(b => { 
                                    const [sp, col] = parseCategory(b.category); 
                                    return sp === space.id && col === colName; 
                                  }).length}
                                </span>

                                {/* Column Actions (Edit / Delete) */}
                                <div className="bm-mgr-subcat-actions" style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                                  <button 
                                    className="bm-mgr-icon-btn" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingColName(colName);
                                      setEditingColTempName(colName);
                                    }}
                                    title="Rename Column"
                                  >
                                    <Edit2 size={9} />
                                  </button>
                                  <button 
                                    className="bm-mgr-icon-btn" 
                                    style={{ color: '#f87171' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteColumn(colName);
                                    }}
                                    title="Delete Column"
                                  >
                                    <Trash2 size={9} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SpacesSidebar;
