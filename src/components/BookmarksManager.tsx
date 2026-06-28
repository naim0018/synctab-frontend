import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Search, Share2, X, ChevronLeft, ChevronRight, ChevronDown, Trash2, Edit2, Check, RefreshCw, FolderOpen
} from 'lucide-react';
import { useDragSort } from '../hooks/useDragSort';
import './BookmarksManager.css';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  clicks: number;
  isShared: boolean;
  userId: string;
}

interface BookmarksManagerProps {
  bookmarks: BookmarkItem[];
  onRefresh: () => void;
}

interface ModalConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

const DEFAULT_SPACES = [
  { id: 'Personal', name: 'Personal', icon: '👤' },
  { id: 'FSD', name: 'FSD', icon: '🌐' },
  { id: 'Work', name: 'Work', icon: '💼' },
  { id: 'Side project', name: 'Side project', icon: '💻' },
  { id: 'Reading list', name: 'Reading list', icon: '📚' }
];

const DEFAULT_COLUMNS: Record<string, string[]> = {
  Personal: ['General', 'Social', 'Entertainment'],
  FSD: ['AI', 'CODE GENERATOR', 'FSD', 'FIGMA', 'GITHUB', 'LIVE SITE', 'Notes'],
  Work: ['Resources', 'Tools', 'Documentation'],
  'Side project': ['Ideas', 'Repos'],
  'Reading list': ['Articles', 'Books']
};

export const BookmarksManager: React.FC<BookmarksManagerProps> = ({ bookmarks, onRefresh }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() => {
    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    const syncSpaceId = `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return { [syncSpaceId]: true };
  });
  const [pendingScrollColumn, setPendingScrollColumn] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState(() => {
    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    return `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openColMenu, setOpenColMenu] = useState<string | null>(null);
  
  // Custom spaces & columns state
  const [spaces, setSpaces] = useState(() => {
    const saved = localStorage.getItem('synctab_custom_spaces');
    let loadedSpaces = saved ? JSON.parse(saved) : DEFAULT_SPACES;

    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    const syncSpaceId = `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (!loadedSpaces.some((s: any) => s.id === syncSpaceId)) {
      loadedSpaces = [
        { id: syncSpaceId, name: `${userEmail}'s Bookmarks`, icon: '🔄', isSyncSpace: true },
        ...loadedSpaces
      ];
      localStorage.setItem('synctab_custom_spaces', JSON.stringify(loadedSpaces));
    }
    return loadedSpaces;
  });

  const [customColumns, setCustomColumns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('synctab_custom_columns');
    const loadedCols = saved ? JSON.parse(saved) : DEFAULT_COLUMNS;

    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    const syncSpaceId = `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (!loadedCols[syncSpaceId]) {
      loadedCols[syncSpaceId] = ['General'];
      localStorage.setItem('synctab_custom_columns', JSON.stringify(loadedCols));
    }
    return loadedCols;
  });

  // Space CRUD states
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingSpaceName, setEditingSpaceName] = useState('');
  const [editingSpaceIcon, setEditingSpaceIcon] = useState('');
  const [showAddSpaceInline, setShowAddSpaceInline] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceIcon, setNewSpaceIcon] = useState('📁');

  // Column CRUD states in sidebar
  const [editingColName, setEditingColName] = useState<string | null>(null);
  const [editingColTempName, setEditingColTempName] = useState('');

  // Reusable Custom Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  const [modalInputVal, setModalInputVal] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Open tabs list (synchronized with synctab_recent_tabs)
  const [openTabs] = useState<Array<{ id: string; title: string; url: string }>>(() => {
    try {
      const saved = localStorage.getItem('synctab_recent_tabs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 't1', title: 'Kids Car Song Script', url: 'https://youtube.com' },
      { id: 't2', title: 'Anatomy of components • Angular', url: 'https://angular.io' },
      { id: 't3', title: 'Angular | Notion', url: 'https://notion.so' },
      { id: 't4', title: 'Image.png (638x144)', url: 'https://imgur.com' },
      { id: 't5', title: 'Angular Material UI Component Libr...', url: 'https://material.angular.io' },
      { id: 't6', title: 'Stitch - Projects', url: 'https://stitch.mongodb.com' },
      { id: 't7', title: 'Stitch - Preview', url: 'https://stitch.mongodb.com' },
      { id: 't8', title: 'Executive Focus | Google AI Studio', url: 'https://aistudio.google.com' },
      { id: 't9', title: 'Angular 21 Full Course in Hindi 2026...', url: 'https://youtube.com' },
      { id: 't10', title: '(1) Make FREE AI Videos (Dialogu...', url: 'https://youtube.com' },
    ];
  });

  // Track inline add-card forms
  const [showAddForm, setShowAddForm] = useState<Record<string, boolean>>({});
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardUrl, setNewCardUrl] = useState('');

  // Scroll to column when a space becomes active
  useEffect(() => {
    if (pendingScrollColumn) {
      const el = document.getElementById(`col-${pendingScrollColumn}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setPendingScrollColumn(null);
      }
    }
  }, [selectedSpaceId, pendingScrollColumn]);

  const currentSyncSpaceId = React.useMemo(() => {
    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    return `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, []);



  // Click outside to close column dropdown menu
  useEffect(() => {
    const handleClose = () => setOpenColMenu(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  // Save custom spaces & columns
  const saveSpaces = (newSpaces: typeof DEFAULT_SPACES) => {
    setSpaces(newSpaces);
    localStorage.setItem('synctab_custom_spaces', JSON.stringify(newSpaces));
  };

  const saveCustomColumns = (newCols: Record<string, string[]>) => {
    setCustomColumns(newCols);
    localStorage.setItem('synctab_custom_columns', JSON.stringify(newCols));
  };

  // Helper Promise-based Alert Modal
  const showAlert = (title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  // Helper Promise-based Confirm Modal
  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  // Helper Promise-based Prompt Modal
  const showPrompt = (title: string, message: string, defaultValue = '', placeholder = ''): Promise<string | null> => {
    setModalInputVal(defaultValue);
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        onConfirm: (val) => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(val || '');
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  };

  // Check if active space is the Sync space
  const activeSpace = spaces.find((s: any) => s.id === selectedSpaceId);
  const isSyncActive = activeSpace?.isSyncSpace || false;

  // Sync with Browser Bookmarks (Two-Way Sync)
  const handleSyncBrowser = async () => {
    setIsSyncing(true);
    try {
      const userStr = localStorage.getItem('synctab_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) {
        await showAlert('Authentication Required', 'Please log in to sync bookmarks.');
        return;
      }

      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;

      let browserBms: Array<{ title: string; url: string; folderName: string }> = [];

      if (hasChrome) {
        // 1. Fetch real Chrome bookmarks tree
        const tree = await new Promise<any[]>((resolve) => {
          (window as any).chrome.bookmarks.getTree(resolve);
        });

        const traverse = (node: any, currentFolder = 'General') => {
          if (node.url) {
            browserBms.push({
              title: node.title || getDomain(node.url),
              url: node.url,
              folderName: currentFolder
            });
          } else {
            let nextFolder = currentFolder;
            if (node.id !== '0' && node.id !== '1' && node.id !== '2') {
              nextFolder = node.title;
            }
            if (node.children) {
              for (const child of node.children) {
                traverse(child, nextFolder);
              }
            }
          }
        };

        if (tree && tree.length > 0) {
          traverse(tree[0]);
        }
      } else {
        // 2. Mock mode for dev/standalone
        const savedMock = localStorage.getItem('synctab_mock_browser_bookmarks');
        if (savedMock) {
          browserBms = JSON.parse(savedMock);
        } else {
          browserBms = [
            { title: 'TabStack', url: 'https://github.com', folderName: 'TabStack' },
            { title: 'QuickLinks', url: 'https://google.com', folderName: 'QuickLinks' },
            { title: 'Vite Guide', url: 'https://vitejs.dev', folderName: 'ai' },
            { title: 'React Docs', url: 'https://react.dev', folderName: 'dark' },
            { title: 'Tailwind CSS', url: 'https://tailwindcss.com', folderName: 'Softvence' },
            { title: 'Google Search', url: 'https://google.com', folderName: 'General' }
          ];
          localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(browserBms));
        }
      }

      // Get existing bookmarks in database for this sync space
      const dbBms = bookmarks.filter(b => {
        const [space] = parseCategory(b.category);
        return space === selectedSpaceId;
      });

      // A. Upload new bookmarks from browser to database
      const toUpload = browserBms.filter(bb => !dbBms.some(db => db.url === bb.url));
      await Promise.all(
        toUpload.map(bb => 
          fetch(`${apiBase}/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: bb.title,
              url: bb.url,
              category: `${selectedSpaceId}/${bb.folderName}`,
              isShared: false,
              userId: user.id
            })
          })
        )
      );

      // B. Download bookmarks from database to browser (that are not in the browser)
      const toDownload = dbBms.filter(db => !browserBms.some(bb => bb.url === db.url));
      if (toDownload.length > 0) {
        if (hasChrome) {
          // Create in Chrome Bookmarks
          for (const dbBm of toDownload) {
            const [, colName] = parseCategory(dbBm.category);
            
            let folderId = await new Promise<string>((resolve) => {
              (window as any).chrome.bookmarks.search({ title: colName }, (results: any[]) => {
                const existingFolder = results.find(r => !r.url);
                if (existingFolder) {
                  resolve(existingFolder.id);
                } else {
                  (window as any).chrome.bookmarks.create({ parentId: '1', title: colName }, (newFolder: any) => {
                    resolve(newFolder.id);
                  });
                }
              });
            });

            await new Promise<void>((resolve) => {
              (window as any).chrome.bookmarks.create({
                parentId: folderId,
                title: dbBm.title,
                url: dbBm.url
              }, () => resolve());
            });
          }
        } else {
          // Append to Mock browser bookmarks
          const updatedMock = [...browserBms];
          toDownload.forEach(dbBm => {
            const [, colName] = parseCategory(dbBm.category);
            updatedMock.push({
              title: dbBm.title,
              url: dbBm.url,
              folderName: colName
            });
          });
          localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(updatedMock));
        }
      }

      // C. Update customColumns with any new folders found
      const foundFolders = Array.from(new Set(browserBms.map(bb => bb.folderName)));
      const currentCols = customColumns[selectedSpaceId] || [];
      const mergedCols = Array.from(new Set([...currentCols, ...foundFolders, 'General']));
      
      const newCols = {
        ...customColumns,
        [selectedSpaceId]: mergedCols
      };
      saveCustomColumns(newCols);

      onRefresh();
      await showAlert('Sync Success', 'Bookmarks successfully synchronized with browser!');
    } catch (err) {
      console.error('Sync failed:', err);
      await showAlert('Sync Error', 'Synchronization failed. Please check the console.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a new space inline
  const handleCreateSpaceInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    const cleanName = newSpaceName.trim();
    const id = cleanName;
    if (spaces.some((s: any) => s.id === id)) {
      await showAlert('Duplicate Space', 'Space already exists');
      return;
    }
    const newSpaces = [...spaces, { id, name: cleanName, icon: newSpaceIcon.trim() || '📁' }];
    saveSpaces(newSpaces);
    saveCustomColumns({ ...customColumns, [id]: ['General'] });
    setNewSpaceName('');
    setNewSpaceIcon('📁');
    setShowAddSpaceInline(false);
    setSelectedSpaceId(id);
  };

  // Save space edits
  const handleSaveSpaceEdit = async (spaceId: string) => {
    if (!editingSpaceName.trim()) return;
    const cleanName = editingSpaceName.trim();
    const cleanIcon = editingSpaceIcon.trim() || '📁';
    const newSpaceId = cleanName;

    // Update spaces array
    const newSpaces = spaces.map((s: any) => {
      if (s.id === spaceId) {
        return { ...s, id: newSpaceId, name: cleanName, icon: cleanIcon };
      }
      return s;
    });

    // Update customColumns keys
    const newCustomCols = { ...customColumns };
    if (spaceId !== newSpaceId) {
      newCustomCols[newSpaceId] = newCustomCols[spaceId] || ['General'];
      delete newCustomCols[spaceId];
    }

    saveSpaces(newSpaces);
    saveCustomColumns(newCustomCols);

    // If spaceId changed, we must update all bookmarks belonging to the old space
    if (spaceId !== newSpaceId) {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const bookmarksToUpdate = bookmarks.filter(b => {
        const [space] = parseCategory(b.category);
        return space === spaceId;
      });

      await Promise.all(
        bookmarksToUpdate.map(b => {
          const [, col] = parseCategory(b.category);
          return fetch(`${apiBase}/bookmarks/${b.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: `${newSpaceId}/${col}` })
          });
        })
      );
    }

    setEditingSpaceId(null);
    setSelectedSpaceId(newSpaceId);
    onRefresh();
  };

  // Delete a space
  const handleDeleteSpace = async (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const space = spaces.find((s: any) => s.id === spaceId);
    if (!space) return;

    const confirmed = await showConfirm(
      'Delete Space', 
      `Are you sure you want to delete the space "${space.name}" and all its bookmarks?`
    );
    if (!confirmed) return;

    // Delete all bookmarks belonging to this space
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    const bookmarksToDelete = bookmarks.filter(b => {
      const [spaceName] = parseCategory(b.category);
      return spaceName === spaceId;
    });

    await Promise.all(
      bookmarksToDelete.map(b => 
        fetch(`${apiBase}/bookmarks/${b.id}`, {
          method: 'DELETE'
        })
      )
    );

    const newSpaces = spaces.filter((s: any) => s.id !== spaceId);
    const newCustomCols = { ...customColumns };
    delete newCustomCols[spaceId];

    saveSpaces(newSpaces);
    saveCustomColumns(newCustomCols);

    // Select another space
    if (selectedSpaceId === spaceId) {
      setSelectedSpaceId(newSpaces[0]?.id || 'Personal');
    }
    onRefresh();
  };

  // Add a new column/category
  const handleAddColumn = async () => {
    const name = await showPrompt('Create Column', 'Enter column/category name:', '', 'Development');
    if (!name?.trim()) return;
    const cleanName = name.trim();
    const currentCols = customColumns[selectedSpaceId] || [];
    if (currentCols.includes(cleanName)) {
      await showAlert('Duplicate Column', 'Column already exists in this space');
      return;
    }

    // If sync space is active, also create folder in browser
    const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasChrome) {
        (window as any).chrome.bookmarks.create({ parentId: '1', title: cleanName });
      } else {
        const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms.push({ title: 'Welcome', url: 'https://synctab.io', folderName: cleanName });
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }

    const newCols = { ...customColumns, [selectedSpaceId]: [...currentCols, cleanName] };
    saveCustomColumns(newCols);
  };

  // Rename a column
  const handleRenameColumn = async (oldColName: string) => {
    if (!editingColTempName.trim()) return;
    const newColName = editingColTempName.trim();
    if (oldColName === newColName) {
      setEditingColName(null);
      return;
    }

    const currentCols = customColumns[selectedSpaceId] || [];
    if (currentCols.includes(newColName)) {
      await showAlert('Duplicate Column', 'A column with that name already exists');
      return;
    }

    // If sync space is active, rename folder in browser
    const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasChrome) {
        (window as any).chrome.bookmarks.search({ title: oldColName }, (results: any[]) => {
          const folder = results.find(r => !r.url);
          if (folder) {
            (window as any).chrome.bookmarks.update(folder.id, { title: newColName });
          }
        });
      } else {
        const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms.forEach((mb: any) => {
          if (mb.folderName === oldColName) mb.folderName = newColName;
        });
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }

    // Update column list
    const newCols = {
      ...customColumns,
      [selectedSpaceId]: currentCols.map(c => c === oldColName ? newColName : c)
    };
    saveCustomColumns(newCols);

    // Update bookmarks in backend
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    const bookmarksToUpdate = bookmarks.filter(b => {
      const [space, col] = parseCategory(b.category);
      return space === selectedSpaceId && col === oldColName;
    });

    await Promise.all(
      bookmarksToUpdate.map(b => 
        fetch(`${apiBase}/bookmarks/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: `${selectedSpaceId}/${newColName}` })
        })
      )
    );

    setEditingColName(null);
    onRefresh();
  };

  // Delete a column
  const handleDeleteColumn = async (colName: string) => {
    const confirmed = await showConfirm(
      'Delete Column', 
      `Are you sure you want to delete the column "${colName}"? The bookmarks in this column will be moved to "General".`
    );
    if (!confirmed) return;

    // If sync space is active, remove folder in browser and move bookmarks
    const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasChrome) {
        (window as any).chrome.bookmarks.search({ title: colName }, (results: any[]) => {
          const folder = results.find(r => !r.url);
          if (folder) {
            (window as any).chrome.bookmarks.search({ title: 'General' }, (genResults: any[]) => {
              const genFolder = genResults.find(r => !r.url);
              const genFolderId = genFolder ? genFolder.id : '1';
              (window as any).chrome.bookmarks.getChildren(folder.id, (children: any[]) => {
                for (const child of children) {
                  (window as any).chrome.bookmarks.move(child.id, { parentId: genFolderId });
                }
                (window as any).chrome.bookmarks.remove(folder.id);
              });
            });
          }
        });
      } else {
        const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms.forEach((mb: any) => {
          if (mb.folderName === colName) mb.folderName = 'General';
        });
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }
    
    // Move bookmarks in this column to General
    const bookmarksToMove = bookmarks.filter(b => {
      const [space, col] = parseCategory(b.category);
      return space === selectedSpaceId && col === colName;
    });

    const currentCols = customColumns[selectedSpaceId] || [];
    const newCols = { ...customColumns, [selectedSpaceId]: currentCols.filter(c => c !== colName) };
    if (!newCols[selectedSpaceId].includes('General')) {
      newCols[selectedSpaceId].push('General');
    }
    saveCustomColumns(newCols);

    // Update bookmarks categories on backend
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    Promise.all(
      bookmarksToMove.map(b => 
        fetch(`${apiBase}/bookmarks/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: `${selectedSpaceId}/General` })
        })
      )
    ).then(() => onRefresh());
  };

  // Parse category into [spaceId, colName]
  const parseCategory = (category: string): [string, string] => {
    if (category.includes('/')) {
      const parts = category.split('/');
      return [parts[0], parts.slice(1).join('/')];
    }
    return ['Personal', category || 'General'];
  };

  const getFavicon = (url: string) => {
    try { return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`; } catch { return ''; }
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  };

  // Add a bookmark inside a column
  const handleAddBookmarkSubmit = async (e: React.FormEvent, colName: string) => {
    e.preventDefault();
    if (!newCardUrl.trim()) return;

    let url = newCardUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const title = newCardTitle.trim() || getDomain(url);
    const category = `${selectedSpaceId}/${colName}`;

    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) return;

    // If sync space is active, add to browser bookmarks
    const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasChrome) {
        (window as any).chrome.bookmarks.search({ title: colName }, (results: any[]) => {
          const folder = results.find(r => !r.url);
          if (folder) {
            (window as any).chrome.bookmarks.create({ parentId: folder.id, title, url });
          } else {
            (window as any).chrome.bookmarks.create({ parentId: '1', title: colName }, (newFolder: any) => {
              (window as any).chrome.bookmarks.create({ parentId: newFolder.id, title, url });
            });
          }
        });
      } else {
        const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms.push({ title, url, folderName: colName });
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url,
          category,
          isShared: false,
          userId: user.id
        })
      });
      if (res.ok) {
        setNewCardTitle('');
        setNewCardUrl('');
        setShowAddForm(prev => ({ ...prev, [colName]: false }));
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  };

  // Delete a bookmark
  const handleDeleteBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;

    const confirmed = await showConfirm('Delete Bookmark', 'Are you sure you want to delete this bookmark?');
    if (!confirmed) return;

    // If sync space is active, remove from browser bookmarks
    const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasChrome) {
        (window as any).chrome.bookmarks.search({ url: bookmark.url }, (results: any[]) => {
          for (const res of results) {
            (window as any).chrome.bookmarks.remove(res.id);
          }
        });
      } else {
        let mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms = mockBms.filter((mb: any) => mb.url !== bookmark.url);
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/bookmarks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  // ─── Pointer-event based drag sort ───────────────────────────────────────
  const getOrderedIds = useCallback((colName: string): string[] => {
    const category = `${selectedSpaceId}/${colName}`;
    const colBms = bookmarks.filter(b => {
      const [space, col] = parseCategory(b.category);
      return space === selectedSpaceId && col === colName;
    });
    const savedOrder = localStorage.getItem('synctab_bookmark_order');
    const orderMap = savedOrder ? JSON.parse(savedOrder) : {};
    const orderList: string[] = orderMap[category] || [];
    const sorted = [...colBms].sort((a, b) => {
      let ia = orderList.indexOf(a.id); let ib = orderList.indexOf(b.id);
      if (ia === -1) ia = 999999; if (ib === -1) ib = 999999;
      return ia - ib;
    });
    return sorted.map(b => b.id);
  }, [bookmarks, selectedSpaceId]);

  const handleReorder = useCallback(async (sourceCol: string, newTargetOrder: string[], itemId: string, targetCol: string) => {
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    const targetCategory = `${selectedSpaceId}/${targetCol}`;
    const sourceCategory = `${selectedSpaceId}/${sourceCol}`;

    // If cross-column move, update category on backend
    if (sourceCol !== targetCol) {
      if (isSyncActive) {
        const bm = bookmarks.find(b => b.id === itemId);
        if (bm) {
          if (hasChrome) {
            (window as any).chrome.bookmarks.search({ url: bm.url }, (results: any[]) => {
              const bmNode = results[0];
              if (bmNode) {
                (window as any).chrome.bookmarks.search({ title: targetCol }, (folderResults: any[]) => {
                  const folder = folderResults.find((r: any) => !r.url);
                  if (folder) (window as any).chrome.bookmarks.move(bmNode.id, { parentId: folder.id });
                });
              }
            });
          } else {
            const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
            const match = mockBms.find((mb: any) => mb.url === bm.url);
            if (match) { match.folderName = targetCol; localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms)); }
          }
        }
      }
      await fetch(`${apiBase}/bookmarks/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: targetCategory })
      });
      // Clear from source order
      const savedOrder = localStorage.getItem('synctab_bookmark_order');
      const orderMap = savedOrder ? JSON.parse(savedOrder) : {};
      if (orderMap[sourceCategory]) {
        orderMap[sourceCategory] = orderMap[sourceCategory].filter((id: string) => id !== itemId);
        orderMap[targetCategory] = newTargetOrder;
        localStorage.setItem('synctab_bookmark_order', JSON.stringify(orderMap));
      }
    } else {
      // Same-column reorder: persist new order
      const savedOrder = localStorage.getItem('synctab_bookmark_order');
      const orderMap = savedOrder ? JSON.parse(savedOrder) : {};
      orderMap[targetCategory] = newTargetOrder;
      localStorage.setItem('synctab_bookmark_order', JSON.stringify(orderMap));
      if (isSyncActive && hasChrome) {
        const bm = bookmarks.find(b => b.id === itemId);
        if (bm) {
          (window as any).chrome.bookmarks.search({ url: bm.url }, (results: any[]) => {
            const bmNode = results[0];
            if (bmNode) (window as any).chrome.bookmarks.move(bmNode.id, { index: newTargetOrder.indexOf(itemId) });
          });
        }
      }
    }
    onRefresh();
  }, [bookmarks, selectedSpaceId, isSyncActive, onRefresh]);

  const { dragState, ghost, onPointerDown } = useDragSort(
    getOrderedIds,
    handleReorder,
    (colName: string) => `col-${colName}`
  );
  // ─────────────────────────────────────────────────────────────────────────

  // Handle drawer tab drops + column-header HTML5 drag (columns still use HTML5 for header reorder)
  const handleColumnHeaderDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.source !== 'column-reorder') return;
      const draggedCol = data.colName;
      if (draggedCol === targetCol) return;
      const currentCols = customColumns[selectedSpaceId] || [];
      const dragIdx = currentCols.indexOf(draggedCol);
      const dropIdx = currentCols.indexOf(targetCol);
      if (dragIdx !== -1 && dropIdx !== -1) {
        const updatedCols = [...currentCols];
        updatedCols.splice(dragIdx, 1);
        updatedCols.splice(dropIdx, 0, draggedCol);
        saveCustomColumns({ ...customColumns, [selectedSpaceId]: updatedCols });
      }
    } catch (err) { console.error(err); }
  };

  // Drop tab from Open-Tabs drawer onto a column
  const handleDrawerTabDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.source !== 'drawer') return;
      const userStr = localStorage.getItem('synctab_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const targetCategory = `${selectedSpaceId}/${targetCol}`;
      const hasChrome = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
      if (isSyncActive) {
        if (hasChrome) {
          (window as any).chrome.bookmarks.search({ title: targetCol }, (folderResults: any[]) => {
            const folder = folderResults.find((r: any) => !r.url);
            const parentId = folder ? folder.id : '1';
            (window as any).chrome.bookmarks.create({ parentId, title: data.title, url: data.url });
          });
        } else {
          const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
          mockBms.push({ title: data.title, url: data.url, folderName: targetCol });
          localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
        }
      }
      const res = await fetch(`${apiBase}/bookmarks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title || getDomain(data.url), url: data.url, category: targetCategory, isShared: false, userId: user.id })
      });
      if (res.ok) onRefresh();
    } catch (err) { console.error(err); }
  };


  // Filter bookmarks by search query and space
  const activeColumns = customColumns[selectedSpaceId] || ['General'];

  // Group bookmarks by column and sort by custom order
  const columnBookmarks = activeColumns.reduce((acc, colName) => {
    const category = `${selectedSpaceId}/${colName}`;
    const colList = bookmarks.filter(b => {
      const [space, col] = parseCategory(b.category);
      const matchesSpace = space === selectedSpaceId;
      const matchesCol = col === colName;
      const matchesSearch = searchQuery
        ? b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.url.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesSpace && matchesCol && matchesSearch;
    });

    const savedOrder = localStorage.getItem('synctab_bookmark_order');
    const orderMap = savedOrder ? JSON.parse(savedOrder) : {};
    const orderList = orderMap[category] || [];

    if (orderList.length > 0) {
      colList.sort((a, b) => {
        let idxA = orderList.indexOf(a.id);
        let idxB = orderList.indexOf(b.id);
        if (idxA === -1) idxA = 999999;
        if (idxB === -1) idxB = 999999;
        return idxA - idxB;
      });
    }

    acc[colName] = colList;
    return acc;
  }, {} as Record<string, BookmarkItem[]>);

  // Open all bookmarks in a column
  const openAllBookmarks = useCallback((colName: string, inNewWindow: boolean) => {
    const list = columnBookmarks[colName] || [];
    const urls = list.map(b => b.url).filter(Boolean);
    if (urls.length === 0) return;

    if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.tabs) {
      if (inNewWindow) {
        (window as any).chrome.windows.create({ url: urls });
      } else {
        urls.forEach(url => {
          (window as any).chrome.tabs.create({ url });
        });
      }
    } else {
      if (inNewWindow) {
        const firstUrl = urls[0];
        const newWin = window.open(firstUrl, '_blank');
        if (newWin) {
          urls.slice(1).forEach(url => {
            newWin.open(url, '_blank');
          });
        }
      } else {
        urls.forEach(url => {
          window.open(url, '_blank');
        });
      }
    }
  }, [columnBookmarks]);

  return (
    <div className="bm-mgr-container">
      {/* Ghost drag element */}
      {ghost.visible && createPortal(
        <div
          className="bm-mgr-drag-ghost"
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
          <div className="bm-mgr-card bm-mgr-drag-ghost-card" style={{ margin: 0 }}>
            <span className="bm-mgr-card-title">{ghost.title}</span>
          </div>
        </div>,
        document.body
      )}

      {/* 1. LEFT SIDEBAR */}
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
                <form onSubmit={handleCreateSpaceInline} className="bm-mgr-sidebar-inline-form">
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
                            onClick={() => handleSaveSpaceEdit(space.id)}
                          >
                            <Check size={10} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`bm-mgr-space-item ${selectedSpaceId === space.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSpaceId(space.id);
                          setExpandedSpaces(prev => ({ ...prev, [space.id]: true }));
                        }}
                      >
                        {!isSidebarCollapsed && (
                          <span 
                            className="bm-mgr-space-chevron"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSpaces(prev => ({ ...prev, [space.id]: !prev[space.id] }));
                            }}
                            style={{ marginRight: '4px', display: 'inline-flex', alignItems: 'center', opacity: selectedSpaceId === space.id ? 0.8 : 0.4 }}
                          >
                            {expandedSpaces[space.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                        )}
                        <span style={{ fontSize: '15px' }}>{space.icon}</span>
                        <span className="bm-mgr-space-name">{space.name}</span>
                        
                        {/* Space Actions (Edit / Delete) */}
                        {!isSidebarCollapsed && (
                          <div className="bm-mgr-space-actions">
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
                            {/* Do not allow deleting the current user's sync space */}
                            {space.id !== currentSyncSpaceId && (
                              <button 
                                className="bm-mgr-icon-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSpace(space.id, e);
                                }}
                                title="Delete Space"
                              >
                                <Trash2 size={10} style={{ color: '#ef4444' }} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Category sub-list when expanded */}
                    {!isSidebarCollapsed && !!expandedSpaces[space.id] && (
                      <div className="bm-mgr-subcategories">
                        {(customColumns[space.id] || ['General']).map(colName => {
                          const isColEditing = editingColName === colName && selectedSpaceId === space.id;

                          return (
                            <div key={colName} className="bm-mgr-subcat-wrapper">
                              {isColEditing ? (
                                <div className="bm-mgr-sidebar-inline-row" style={{ padding: '2px 12px' }}>
                                  <input 
                                    type="text" 
                                    value={editingColTempName} 
                                    onChange={e => setEditingColTempName(e.target.value)}
                                    className="bm-mgr-inline-input"
                                    style={{ flex: 1, fontSize: '11px', padding: '2px 6px' }}
                                    autoFocus
                                    required
                                  />
                                  <button 
                                    className="bm-mgr-icon-btn" 
                                    onClick={() => handleRenameColumn(colName)}
                                  >
                                    <Check size={10} />
                                  </button>
                                  <button 
                                    className="bm-mgr-icon-btn" 
                                    onClick={() => setEditingColName(null)}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="bm-mgr-subcat-item"
                                  onClick={() => {
                                    if (selectedSpaceId !== space.id) {
                                      setSelectedSpaceId(space.id);
                                      setPendingScrollColumn(colName);
                                    } else {
                                      const el = document.getElementById(`col-${colName}`);
                                      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                    }
                                  }}
                                >
                                  <span style={{ opacity: 0.5 }}>#</span>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {colName}
                                  </span>

                                  {/* Column Actions (Edit / Delete) */}
                                  <div className="bm-mgr-subcat-actions">
                                    <button 
                                      className="bm-mgr-icon-btn" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingColName(colName);
                                        setEditingColTempName(colName);
                                      }}
                                      title="Rename Column"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button 
                                      className="bm-mgr-icon-btn" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteColumn(colName);
                                      }}
                                      title="Delete Column"
                                    >
                                      <Trash2 size={10} style={{ color: '#ef4444' }} />
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

      {/* 2. MAIN CONTENT AREA */}
      <div className="bm-mgr-main">
        <div className="bm-mgr-header">
          <div className="bm-mgr-header-left">
            <div className="bm-mgr-space-title">
              <span>{spaces.find((s: any) => s.id === selectedSpaceId)?.icon || '📁'}</span>
              <span>{spaces.find((s: any) => s.id === selectedSpaceId)?.name || selectedSpaceId}</span>
            </div>
          </div>

          <div className="bm-mgr-header-right">
            {isSyncActive && (
              <button 
                className={`bm-mgr-btn bm-mgr-btn-sync ${isSyncing ? 'syncing' : ''}`} 
                onClick={handleSyncBrowser}
                disabled={isSyncing}
                title="Synchronize browser bookmarks with SyncTab database"
              >
                <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync with Browser'}</span>
              </button>
            )}
            <button className="bm-mgr-btn">
              <Share2 size={14} /> Share
            </button>
            <button className="bm-mgr-btn" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
              <span>Open tabs</span>
              <span className="bm-mgr-badge">{openTabs.length}</span>
            </button>
            <button className="bm-mgr-btn bm-mgr-btn-primary" onClick={handleAddColumn}>
              <Plus size={14} /> Add Column
            </button>
          </div>
        </div>

        <div className="bm-mgr-workspace" style={{ userSelect: ghost.visible ? 'none' : undefined }}>
          {activeColumns.map(colName => {
            const isAdding = showAddForm[colName];
            const list = (columnBookmarks[colName] || []).filter(b => b.id !== dragState.draggedId);
            const isDraggingOver = dragState.overColName === colName;

            return (
              <div 
                key={colName}
                id={`col-${colName}`}
                data-col-drop-zone={colName}
                className={`bm-mgr-column ${isDraggingOver ? 'drag-over' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { handleColumnHeaderDrop(e, colName); handleDrawerTabDrop(e, colName); }}
              >
                <div 
                  className="bm-mgr-column-header"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ 
                      source: 'column-reorder', 
                      colName 
                    }));
                  }}
                  style={{ cursor: 'grab' }}
                >
                  <div className="bm-mgr-column-title-wrapper">
                    {editingColName === colName ? (
                      <div 
                        className="bm-mgr-column-rename-row" 
                        onClick={e => e.stopPropagation()} 
                        onDragStart={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <input 
                          type="text" 
                          value={editingColTempName} 
                          onChange={e => setEditingColTempName(e.target.value)}
                          className="bm-mgr-inline-input"
                          style={{ fontSize: '13px', padding: '2px 6px', width: '120px' }}
                          autoFocus
                          required
                        />
                        <button 
                          className="bm-mgr-icon-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameColumn(colName);
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <button 
                          className="bm-mgr-icon-btn" 
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
                        <span className="bm-mgr-column-title">{colName}</span>
                        <span className="bm-mgr-column-count">{list.length}</span>
                      </>
                    )}
                  </div>
                  <div className="bm-mgr-column-actions" style={{ position: 'relative' }}>
                    <button 
                      className="bm-mgr-icon-btn" 
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
                        className="bm-mgr-icon-btn" 
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
                      className="bm-mgr-icon-btn" 
                      onClick={() => setShowAddForm(prev => ({ ...prev, [colName]: !prev[colName] }))}
                      title="Add Link"
                      onDragStart={(e) => e.stopPropagation()}
                    >
                      <Plus size={14} />
                    </button>
                    {/* Do not allow deleting columns of the default browser bookmarks sync space */}
                    {selectedSpaceId !== currentSyncSpaceId && (
                      <button 
                        className="bm-mgr-icon-btn" 
                        onClick={() => handleDeleteColumn(colName)}
                        title="Delete Column"
                        onDragStart={(e) => e.stopPropagation()}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {/* Column Dropdown Menu */}
                    {openColMenu === colName && (
                      <div className="bm-mgr-col-dropdown" onClick={e => e.stopPropagation()}>
                        <button 
                          className="bm-mgr-col-dropdown-item"
                          onClick={() => {
                            openAllBookmarks(colName, false);
                            setOpenColMenu(null);
                          }}
                        >
                          Open all in new tabs
                        </button>
                        <button 
                          className="bm-mgr-col-dropdown-item"
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

                <div className="bm-mgr-column-cards">
                  {/* Inline Add Card Form */}
                  {isAdding && (
                    <form onSubmit={(e) => handleAddBookmarkSubmit(e, colName)} className="bm-mgr-add-card-form">
                      <input 
                        type="text" 
                        placeholder="Link Title (Optional)" 
                        value={newCardTitle} 
                        onChange={e => setNewCardTitle(e.target.value)}
                        className="bm-mgr-inline-input"
                      />
                      <input 
                        type="text" 
                        placeholder="example.com" 
                        value={newCardUrl} 
                        onChange={e => setNewCardUrl(e.target.value)}
                        required
                        className="bm-mgr-inline-input"
                        autoFocus
                      />
                      <div className="bm-mgr-inline-actions">
                        <button 
                          type="button" 
                          className="bm-mgr-inline-btn bm-mgr-inline-btn-cancel"
                          onClick={() => setShowAddForm(prev => ({ ...prev, [colName]: false }))}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="bm-mgr-inline-btn bm-mgr-inline-btn-submit">
                          Add
                        </button>
                      </div>
                    </form>
                  )}

                  {list.map((b, index) => {
                    const isDragged = dragState.draggedId === b.id;
                    const showIndicatorBefore = isDraggingOver && dragState.overIndex === index;

                    return (
                      <React.Fragment key={b.id}>
                        {showIndicatorBefore && (
                          <div className="bm-mgr-drop-indicator" style={{ height: '42px' }} />
                        )}
                        <div
                          data-card-id={b.id}
                          className={`bm-mgr-card ${isDragged ? 'bm-mgr-card-dragging' : ''}`}
                          onClick={() => !ghost.visible && window.open(b.url, '_blank')}
                          onPointerDown={e => onPointerDown(b.id, colName, b.title, e)}
                        >
                          <div className="bm-mgr-card-icon">
                            <img
                              src={getFavicon(b.url)}
                              alt=""
                              width={14}
                              height={14}
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          <span className="bm-mgr-card-title">{b.title}</span>
                          <button
                            className="bm-mgr-card-delete"
                            onClick={e => handleDeleteBookmark(b.id, e)}
                            title="Delete Bookmark"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Indicator at end of list */}
                  {isDraggingOver && dragState.overIndex === list.length && (
                    <div className="bm-mgr-drop-indicator" style={{ height: '42px' }} />
                  )}

                  {list.length === 0 && !isAdding && !isDraggingOver && (
                    <div className="bm-mgr-col-empty">Drag tabs here or click + to add links</div>
                  )}
                </div>
              </div>
            );
          })}


          {/* Add Column Card */}
          <div className="bm-mgr-add-col-card" onClick={handleAddColumn}>
            <div className="bm-mgr-add-col-btn-inner">
              <Plus size={20} />
              <span>Add Column</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT DRAWER - OPEN TABS */}
      {isDrawerOpen && (
        <div className="bm-mgr-drawer">
          <div className="bm-mgr-drawer-header">
            <div className="bm-mgr-drawer-title-row">
              <span className="bm-mgr-drawer-title">Open tabs</span>
              <span className="bm-mgr-drawer-meta">{openTabs.length} tabs</span>
            </div>
            <button 
              className="bm-mgr-icon-btn" 
              onClick={() => setIsDrawerOpen(false)}
              title="Close Panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="bm-mgr-drawer-content">
            <div className="bm-mgr-drawer-section">
              <div className="bm-mgr-drawer-section-header">
                <span className="bm-mgr-drawer-section-title">Current window</span>
                <span className="bm-mgr-drawer-section-count">{openTabs.length} Tabs</span>
              </div>

              <div className="bm-mgr-drawer-tabs-list">
                {openTabs.map(tab => (
                  <div 
                    key={tab.id}
                    className="bm-mgr-drawer-tab-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ 
                        title: tab.title, 
                        url: tab.url, 
                        source: 'drawer' 
                      }));
                    }}
                  >
                    <img 
                      src={getFavicon(tab.url)} 
                      alt="" 
                      width={16} 
                      height={16}
                      style={{ borderRadius: '3px' }}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="bm-mgr-drawer-tab-info">
                      <span className="bm-mgr-drawer-tab-title">{tab.title}</span>
                      <span className="bm-mgr-drawer-tab-url">{getDomain(tab.url)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. REUSABLE CUSTOM MODAL */}
      {modalConfig.isOpen && (
        <div className="bm-custom-modal-backdrop" onClick={modalConfig.onCancel}>
          <div className="bm-custom-modal-card" onClick={e => e.stopPropagation()}>
            <div className="bm-custom-modal-header">
              <span className="bm-custom-modal-title">{modalConfig.title}</span>
              <button className="bm-mgr-icon-btn" onClick={modalConfig.onCancel}>
                <X size={16} />
              </button>
            </div>

            <div className="bm-custom-modal-body">
              <div>{modalConfig.message}</div>
              {modalConfig.type === 'prompt' && (
                <input 
                  type="text" 
                  value={modalInputVal} 
                  onChange={e => setModalInputVal(e.target.value)}
                  className="bm-custom-modal-input"
                  placeholder={modalConfig.placeholder}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') modalConfig.onConfirm(modalInputVal);
                    if (e.key === 'Escape') modalConfig.onCancel();
                  }}
                />
              )}
            </div>

            <div className="bm-custom-modal-footer">
              {modalConfig.type !== 'alert' && (
                <button 
                  className="bm-mgr-btn" 
                  onClick={modalConfig.onCancel}
                >
                  Cancel
                </button>
              )}
              <button 
                className="bm-mgr-btn bm-mgr-btn-primary" 
                onClick={() => modalConfig.onConfirm(modalConfig.type === 'prompt' ? modalInputVal : undefined)}
              >
                {modalConfig.type === 'alert' ? 'OK' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
