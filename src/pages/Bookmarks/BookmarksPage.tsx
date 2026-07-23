import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Share2, RefreshCw } from 'lucide-react';
import { useDragSort } from '../../hooks/useDragSort';
import SpacesSidebar from './components/SpacesSidebar';
import RecentTabs from './components/RecentTabs';
import BookmarkColumn from './components/BookmarkColumn';
import CustomConfirmModal from './components/CustomConfirmModal';
import './BookmarksPage.css';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  clicks: number;
  isShared: boolean;
  userId: string;
  createdAt?: string;
  position?: number;
}

interface BookmarksPageProps {
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

const parseCategory = (category: string): [string, string] => {
  if (category.includes('/')) {
    const parts = category.split('/');
    return [parts[0], parts.slice(1).join('/')];
  }
  return ['Personal', category || 'General'];
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ bookmarks: backendBookmarks, onRefresh }) => {
  const [localBms, setLocalBms] = useState<BookmarkItem[]>([]);
  const [pendingSyncBms, setPendingSyncBms] = useState<any[] | null>(null);

  useEffect(() => {
    setLocalBms(backendBookmarks);
  }, [backendBookmarks]);

  const bookmarks = localBms;

  const [searchQuery, setSearchQuery] = useState('');
  const [isTabsDrawerOpen, setIsTabsDrawerOpen] = useState(false);
  const [openColMenu, setOpenColMenu] = useState<string | null>(null);
  const [pendingScrollColumn, setPendingScrollColumn] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState<Record<string, boolean>>({});
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  // Spaces & Columns State
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

  const [selectedSpaceId, setSelectedSpaceId] = useState(() => {
    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    return `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  });

  const [currentSyncSpaceId, setCurrentSyncSpaceId] = useState<string>(() => {
    const saved = localStorage.getItem('synctab_current_browser_sync_space_id');
    if (saved) return saved;

    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || 'User';
    const fallbackId = `Sync_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    localStorage.setItem('synctab_current_browser_sync_space_id', fallbackId);
    return fallbackId;
  });

  // Reusable custom modals state
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Open tabs list
  const [openTabs, setOpenTabs] = useState<Array<{ id: string; title: string; url: string }>>(() => {
    try {
      const saved = localStorage.getItem('synctab_recent_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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

  const processAndSetTabs = useCallback((tabs: any[]) => {
    const formatted = tabs
      .filter(t => {
        if (!t || !t.url || !t.title) return false;
        const u = t.url.toLowerCase();
        return !u.startsWith('chrome://') && 
               !u.startsWith('chrome-extension://') && 
               !u.startsWith('about:') && 
               !u.startsWith('edge://');
      })
      .map((t, idx) => ({
        id: t.id?.toString() || `tab_${idx}_${Date.now()}`,
        title: t.title || '',
        url: t.url || ''
      }));
    
    if (formatted.length > 0) {
      setOpenTabs(formatted);
      localStorage.setItem('synctab_recent_tabs', JSON.stringify(formatted));
    }
  }, []);

  const refreshOpenTabs = useCallback(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).chrome &&
        (window as any).chrome.tabs &&
        typeof (window as any).chrome.tabs.query === 'function'
      ) {
        (window as any).chrome.tabs.query({}, (tabs: any[]) => {
          if (Array.isArray(tabs)) {
            processAndSetTabs(tabs);
          }
        });
      } else if (typeof window !== 'undefined') {
        window.postMessage({ type: 'SYNCTAB_QUERY_TABS' }, '*');
      }
    } catch (e) {
      console.warn("Failed to query chrome tabs, keeping mock tabs:", e);
    }
  }, [processAndSetTabs]);

  useEffect(() => {
    refreshOpenTabs();

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'SYNCTAB_TABS_RESPONSE') {
        if (Array.isArray(event.data.tabs)) {
          processAndSetTabs(event.data.tabs);
        }
      } else if (event.data && event.data.type === 'SYNCTAB_TABS_UPDATED') {
        refreshOpenTabs();
      }
    };
    window.addEventListener('message', handleMessage);

    try {
      const hasChromeTabs = typeof window !== 'undefined' && 
                            (window as any).chrome && 
                            (window as any).chrome.tabs;
      
      if (hasChromeTabs) {
        const tabsAPI = (window as any).chrome.tabs;
        const listener = () => refreshOpenTabs();

        tabsAPI.onCreated?.addListener(listener);
        tabsAPI.onUpdated?.addListener(listener);
        tabsAPI.onRemoved?.addListener(listener);
        tabsAPI.onMoved?.addListener(listener);
        tabsAPI.onActivated?.addListener(listener);

        return () => {
          window.removeEventListener('message', handleMessage);
          try {
            tabsAPI.onCreated?.removeListener(listener);
            tabsAPI.onUpdated?.removeListener(listener);
            tabsAPI.onRemoved?.removeListener(listener);
            tabsAPI.onMoved?.removeListener(listener);
            tabsAPI.onActivated?.removeListener(listener);
          } catch (err) {
            console.warn("Failed to remove tab listeners:", err);
          }
        };
      }
    } catch (e) {
      console.warn("Failed to set up chrome tab event listeners:", e);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [refreshOpenTabs, processAndSetTabs]);

  // Click outside to close column dropdown menu
  useEffect(() => {
    const handleClose = () => setOpenColMenu(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  // Scroll to column when space changes
  useEffect(() => {
    if (pendingScrollColumn) {
      const el = document.getElementById(`col-${pendingScrollColumn}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setPendingScrollColumn(null);
      }
    }
  }, [selectedSpaceId, pendingScrollColumn]);

  const activeSpace = spaces.find((s: any) => s.id === selectedSpaceId);
  const isSyncActive = (activeSpace?.isSyncSpace && selectedSpaceId === currentSyncSpaceId) || false;

  const saveSpaces = (newSpaces: typeof DEFAULT_SPACES) => {
    setSpaces(newSpaces);
    localStorage.setItem('synctab_custom_spaces', JSON.stringify(newSpaces));
  };

  const saveCustomColumns = (newCols: Record<string, string[]>) => {
    setCustomColumns(newCols);
    localStorage.setItem('synctab_custom_columns', JSON.stringify(newCols));
  };

  // Reusable custom modals
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

  const showPrompt = (title: string, message: string, defaultValue = '', placeholder = ''): Promise<string | null> => {
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

  // Load linked Google accounts on mount to add them as Sync spaces
  useEffect(() => {
    const loadLinkedSpaces = async () => {
      const userStr = localStorage.getItem('synctab_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;

      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      try {
        const res = await fetch(`${apiBase}/users/${user.id}/google-accounts`);
        if (res.ok) {
          const result = await res.json();
          const accounts = Array.isArray(result) ? result : (result.data || []);
          
          setSpaces((prevSpaces: any[]) => {
            let updated = [...prevSpaces];
            let changed = false;
            accounts.forEach((acct: any) => {
              const email = acct.googleEmail;
              const spaceId = `Sync_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
              if (!updated.some(s => s.id === spaceId)) {
                updated.push({
                  id: spaceId,
                  name: `${email}'s Bookmarks`,
                  icon: '🔄',
                  isSyncSpace: true
                });
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem('synctab_custom_spaces', JSON.stringify(updated));
            }
            return updated;
          });
        }
      } catch (e) {
        console.error('Error fetching linked accounts:', e);
      }
    };
    loadLinkedSpaces();
  }, []);

  const handleSetCurrentBrowserSyncSpace = () => {
    localStorage.setItem('synctab_current_browser_sync_space_id', selectedSpaceId);
    setCurrentSyncSpaceId(selectedSpaceId);
  };

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

      let browserBms: Array<{ title: string; url: string; folderName: string; position?: number }> = [];
      let tree: any[] | null = null;

      try {
        tree = await new Promise<any[]>((resolve, reject) => {
          const handler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data && event.data.type === 'SYNCTAB_BOOKMARKS_RESPONSE') {
              window.removeEventListener('message', handler);
              resolve(event.data.tree || []);
            }
          };
          window.addEventListener('message', handler);
          window.postMessage({ type: 'SYNCTAB_QUERY_BOOKMARKS' }, '*');
          
          setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error('Extension response timeout'));
          }, 1500);
        });
      } catch (e) {
        console.log("SyncTab: Extension bridge failed, checking direct chrome api...", e);
        if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks) {
          tree = await new Promise<any[]>((resolve) => {
            (window as any).chrome.bookmarks.getTree(resolve);
          });
        }
      }

      if (tree && tree.length > 0) {
        const folderIndices: Record<string, number> = {};
        const traverse = (node: any, currentFolder = 'General') => {
          if (node.url) {
            if (folderIndices[currentFolder] === undefined) {
              folderIndices[currentFolder] = 0;
            } else {
              folderIndices[currentFolder]++;
            }
            browserBms.push({
              title: node.title || getDomain(node.url),
              url: node.url,
              folderName: currentFolder,
              position: folderIndices[currentFolder]
            });
          } else {
            let nextFolder = currentFolder;
            if (node.id !== '0' && node.id !== '1' && node.id !== '2') {
              nextFolder = currentFolder === 'General' || currentFolder === '' ? node.title : `${currentFolder} ❯ ${node.title}`;
            }
            if (node.children) {
              for (const child of node.children) {
                traverse(child, nextFolder);
              }
            }
          }
        };

        traverse(tree[0]);
      } else {
        const savedMock = localStorage.getItem('synctab_mock_browser_bookmarks');
        if (savedMock) {
          browserBms = JSON.parse(savedMock);
        } else {
          browserBms = [
            { title: 'TabStack', url: 'https://github.com', folderName: 'TabStack', position: 0 },
            { title: 'QuickLinks', url: 'https://google.com', folderName: 'QuickLinks', position: 0 },
            { title: 'Vite Guide', url: 'https://vitejs.dev', folderName: 'ai', position: 0 },
            { title: 'React Docs', url: 'https://react.dev', folderName: 'dark', position: 0 },
            { title: 'Tailwind CSS', url: 'https://tailwindcss.com', folderName: 'Softvence', position: 0 },
            { title: 'Google Search', url: 'https://google.com', folderName: 'General', position: 0 }
          ];
          localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(browserBms));
        }
      }

      const otherBms = backendBookmarks.filter(b => {
        const [space] = parseCategory(b.category);
        return space !== selectedSpaceId;
      });

      const syncedLocal = browserBms.map((bb, idx) => ({
        id: `temp_${idx}_${Date.now()}`,
        title: bb.title,
        url: bb.url,
        category: `${selectedSpaceId}/${bb.folderName}`,
        clicks: 0,
        isShared: false,
        userId: '',
        position: bb.position ?? 0
      }));

      setLocalBms([...otherBms, ...syncedLocal]);

      const foundFolders = Array.from(new Set(browserBms.map(bb => bb.folderName)));
      const currentCols = customColumns[selectedSpaceId] || [];
      const mergedCols = Array.from(new Set([...foundFolders, ...currentCols, 'General']));
      saveCustomColumns({
        ...customColumns,
        [selectedSpaceId]: mergedCols
      });

      setPendingSyncBms(browserBms);
      await showAlert('Synced Locally', 'Bookmarks loaded from browser locally. Click "Save to Database" in the header to save changes.');
    } catch (err) {
      console.error('Sync failed:', err);
      await showAlert('Sync Error', 'Synchronization failed. Please check the console.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSyncToDatabase = async () => {
    if (!pendingSyncBms) return;
    setIsSyncing(true);
    try {
      const userStr = localStorage.getItem('synctab_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) {
        await showAlert('Authentication Required', 'Please log in to save bookmarks.');
        return;
      }

      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const dbBms = backendBookmarks.filter(b => {
        const [space] = parseCategory(b.category);
        return space === selectedSpaceId;
      });

      const toUpload = pendingSyncBms.filter(bb => !dbBms.some(db => db.url === bb.url));
      const toUpdate = pendingSyncBms.map(bb => {
        const existing = dbBms.find(db => db.url === bb.url);
        if (existing) {
          const expectedCategory = `${selectedSpaceId}/${bb.folderName}`;
          if (existing.category !== expectedCategory || existing.title !== bb.title || (existing as any).position !== bb.position) {
            return { id: existing.id, title: bb.title, category: expectedCategory, position: bb.position };
          }
        }
        return null;
      }).filter(Boolean) as Array<{ id: string; title: string; category: string; position: number }>;

      await Promise.all([
        ...toUpload.map(bb => 
          fetch(`${apiBase}/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: bb.title,
              url: bb.url,
              category: `${selectedSpaceId}/${bb.folderName}`,
              isShared: false,
              userId: user.id,
              position: bb.position ?? 0
            })
          })
        ),
        ...toUpdate.map(up => 
          fetch(`${apiBase}/bookmarks/${up.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: up.title,
              category: up.category,
              position: up.position
            })
          })
        )
      ]);

      // Remove deleted bookmarks
      const toDelete = dbBms.filter(db => !pendingSyncBms.some(bb => bb.url === db.url));
      await Promise.all(
        toDelete.map(db => fetch(`${apiBase}/bookmarks/${db.id}`, { method: 'DELETE' }))
      );

      await showAlert('Save Success', 'Bookmarks successfully saved to database!');
      setPendingSyncBms(null);
      onRefresh();
    } catch (err) {
      console.error('Save failed:', err);
      await showAlert('Save Error', 'Failed to save bookmarks to database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncCloudOnly = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Cloud sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSpace = (name: string, icon: string) => {
    if (spaces.some((s: any) => s.id === name)) {
      showAlert('Duplicate Space', 'Space already exists');
      return;
    }
    const newSpaces = [...spaces, { id: name, name, icon }];
    saveSpaces(newSpaces);
    saveCustomColumns({ ...customColumns, [name]: ['General'] });
    setSelectedSpaceId(name);
  };

  const handleRenameSpace = async (id: string, name: string, icon: string) => {
    const newSpaceId = name;
    const newSpaces = spaces.map((s: any) => {
      if (s.id === id) {
        return { ...s, id: newSpaceId, name, icon };
      }
      return s;
    });

    const newCustomCols = { ...customColumns };
    if (id !== newSpaceId) {
      newCustomCols[newSpaceId] = newCustomCols[id] || ['General'];
      delete newCustomCols[id];
    }

    saveSpaces(newSpaces);
    saveCustomColumns(newCustomCols);

    if (id !== newSpaceId) {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const bookmarksToUpdate = bookmarks.filter(b => {
        const [space] = parseCategory(b.category);
        return space === id;
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
    setSelectedSpaceId(newSpaceId);
    onRefresh();
  };

  const handleDeleteSpace = async (spaceId: string) => {
    const space = spaces.find((s: any) => s.id === spaceId);
    if (!space) return;

    const confirmed = await showConfirm(
      'Delete Space', 
      `Are you sure you want to delete the space "${space.name}" and all its bookmarks?`
    );
    if (!confirmed) return;

    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    const bookmarksToDelete = bookmarks.filter(b => {
      const [spaceName] = parseCategory(b.category);
      return spaceName === spaceId;
    });

    await Promise.all(
      bookmarksToDelete.map(b => 
        fetch(`${apiBase}/bookmarks/${b.id}`, { method: 'DELETE' })
      )
    );

    const newSpaces = spaces.filter((s: any) => s.id !== spaceId);
    const newCustomCols = { ...customColumns };
    delete newCustomCols[spaceId];

    saveSpaces(newSpaces);
    saveCustomColumns(newCustomCols);

    if (selectedSpaceId === spaceId) {
      setSelectedSpaceId(newSpaces[0]?.id || 'Personal');
    }
    onRefresh();
  };

  const handleAddColumn = async () => {
    const name = await showPrompt('Create Column', 'Enter column/category name:', '', 'Development');
    if (!name?.trim()) return;
    const cleanName = name.trim();
    const currentCols = customColumns[selectedSpaceId] || [];
    if (currentCols.includes(cleanName)) {
      await showAlert('Duplicate Column', 'Column already exists in this space');
      return;
    }

    const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasBookmarks) {
        (window as any).chrome.bookmarks.create({ parentId: '1', title: cleanName });
      } else {
        const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms.push({ title: 'Welcome', url: 'https://synctab.io', folderName: cleanName });
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }

    saveCustomColumns({
      ...customColumns,
      [selectedSpaceId]: [...currentCols, cleanName]
    });
  };

  const handleRenameColumn = async (oldColName: string, newColName: string) => {
    const currentCols = customColumns[selectedSpaceId] || [];
    if (currentCols.includes(newColName)) {
      await showAlert('Duplicate Column', 'A column with that name already exists');
      return;
    }

    const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasBookmarks) {
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

    saveCustomColumns({
      ...customColumns,
      [selectedSpaceId]: currentCols.map(c => c === oldColName ? newColName : c)
    });

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
    onRefresh();
  };

  const handleDeleteColumn = async (colName: string) => {
    const confirmed = await showConfirm(
      'Delete Column', 
      `Are you sure you want to delete the column "${colName}"? The bookmarks in this column will be moved to "General".`
    );
    if (!confirmed) return;

    const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasBookmarks) {
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

    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    await Promise.all(
      bookmarksToMove.map(b => 
        fetch(`${apiBase}/bookmarks/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: `${selectedSpaceId}/General` })
        })
      )
    );
    onRefresh();
  };

  const handleAddBookmarkSubmit = async (colName: string, title: string, url: string) => {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanTitle = title.trim() || getDomain(cleanUrl);
    const category = `${selectedSpaceId}/${colName}`;

    const userStr = localStorage.getItem('synctab_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) return;

    const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasBookmarks) {
        (window as any).chrome.bookmarks.search({ title: colName }, (results: any[]) => {
          const folder = results.find(r => !r.url);
          if (folder) {
            (window as any).chrome.bookmarks.create({ parentId: folder.id, title: cleanTitle, url: cleanUrl });
          } else {
            (window as any).chrome.bookmarks.create({ parentId: '1', title: colName }, (newFolder: any) => {
              (window as any).chrome.bookmarks.create({ parentId: newFolder.id, title: cleanTitle, url: cleanUrl });
            });
          }
        });
      } else {
        const mockBms = JSON.parse(localStorage.getItem('synctab_mock_browser_bookmarks') || '[]');
        mockBms.push({ title: cleanTitle, url: cleanUrl, folderName: colName });
        localStorage.setItem('synctab_mock_browser_bookmarks', JSON.stringify(mockBms));
      }
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          url: cleanUrl,
          category,
          isShared: false,
          userId: user.id
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  };

  const handleDeleteBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;

    const confirmed = await showConfirm('Delete Bookmark', 'Are you sure you want to delete this bookmark?');
    if (!confirmed) return;

    const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    if (isSyncActive) {
      if (hasBookmarks) {
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
      const res = await fetch(`${apiBase}/bookmarks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const getOrderedIds = useCallback((colName: string): string[] => {
    const colBms = bookmarks.filter(b => {
      const [space, col] = parseCategory(b.category);
      return space === selectedSpaceId && col === colName;
    });
    const sorted = [...colBms].sort((a, b) => {
      const posA = a.position ?? 0;
      const posB = b.position ?? 0;
      if (posA !== posB) return posA - posB;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    return sorted.map(b => b.id);
  }, [bookmarks, selectedSpaceId]);

  const handleReorder = useCallback(async (sourceCol: string, newTargetOrder: string[], itemId: string, targetCol: string) => {
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
    const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
    const targetCategory = `${selectedSpaceId}/${targetCol}`;
    const sourceCategory = `${selectedSpaceId}/${sourceCol}`;

    if (sourceCol !== targetCol) {
      if (isSyncActive) {
        const bm = bookmarks.find(b => b.id === itemId);
        if (bm) {
          if (hasBookmarks) {
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
      const savedOrder = localStorage.getItem('synctab_bookmark_order');
      const orderMap = savedOrder ? JSON.parse(savedOrder) : {};
      if (orderMap[sourceCategory]) {
        orderMap[sourceCategory] = orderMap[sourceCategory].filter((id: string) => id !== itemId);
        orderMap[targetCategory] = newTargetOrder;
        localStorage.setItem('synctab_bookmark_order', JSON.stringify(orderMap));
      }

      const sourceBms = bookmarks.filter(b => {
        const [space, col] = parseCategory(b.category);
        return space === selectedSpaceId && col === sourceCol && b.id !== itemId;
      });
      const sourceOrder = sourceBms.map(b => b.id);
      await Promise.all(sourceOrder.map((id, index) => 
        fetch(`${apiBase}/bookmarks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: index })
        })
      ));
    } else {
      const savedOrder = localStorage.getItem('synctab_bookmark_order');
      const orderMap = savedOrder ? JSON.parse(savedOrder) : {};
      orderMap[targetCategory] = newTargetOrder;
      localStorage.setItem('synctab_bookmark_order', JSON.stringify(orderMap));
      if (isSyncActive && hasBookmarks) {
        const bm = bookmarks.find(b => b.id === itemId);
        if (bm) {
          (window as any).chrome.bookmarks.search({ url: bm.url }, (results: any[]) => {
            const bmNode = results[0];
            if (bmNode) (window as any).chrome.bookmarks.move(bmNode.id, { index: newTargetOrder.indexOf(itemId) });
          });
        }
      }
    }

    await Promise.all(newTargetOrder.map((id, index) => 
      fetch(`${apiBase}/bookmarks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: index })
      })
    ));
    onRefresh();
  }, [bookmarks, selectedSpaceId, isSyncActive, onRefresh]);

  const { dragState, ghost, onPointerDown } = useDragSort(
    getOrderedIds,
    handleReorder,
    (colName: string) => `col-${colName}`
  );

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
      const hasBookmarks = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.bookmarks;
      if (isSyncActive) {
        if (hasBookmarks) {
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

  const getActiveColumnsForSpace = useCallback((spaceId: string) => {
    const localCols = customColumns[spaceId] || [];
    const combined = [...localCols];
    
    const cols = new Set<string>();
    bookmarks.forEach(b => {
      const [space, col] = parseCategory(b.category);
      if (space === spaceId && col) {
        cols.add(col);
      }
    });

    cols.forEach((col: string) => {
      if (!combined.includes(col)) {
        combined.push(col);
      }
    });

    return combined.length > 0 ? combined : ['General'];
  }, [customColumns, bookmarks]);

  const activeColumns = useMemo<string[]>(() => {
    return getActiveColumnsForSpace(selectedSpaceId);
  }, [selectedSpaceId, getActiveColumnsForSpace]);

  const columnBookmarks = activeColumns.reduce((acc: Record<string, BookmarkItem[]>, colName: string) => {
    const colList = bookmarks.filter(b => {
      const [space, col] = parseCategory(b.category);
      const matchesSpace = space === selectedSpaceId;
      const matchesCol = col === colName;
      const matchesSearch = searchQuery
        ? b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.url.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesSpace && matchesCol && matchesSearch;
    });

    colList.sort((a, b) => {
      const posA = a.position ?? 0;
      const posB = b.position ?? 0;
      if (posA !== posB) return posA - posB;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    acc[colName] = colList;
    return acc;
  }, {} as Record<string, BookmarkItem[]>);

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

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
        <div 
          className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden border-r" 
          style={{ 
            background: 'var(--bm-main-bg)', 
            borderColor: 'var(--panel-border)'
          }}
        >
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
            {/* NORMAL BOOKMARK COLUMNS */}
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
      </div>

      {/* 1. RIGHT SIDEBAR */}
      <SpacesSidebar
        isCollapsed={isRightSidebarCollapsed}
        setIsCollapsed={setIsRightSidebarCollapsed}
        spaces={spaces}
        selectedSpaceId={selectedSpaceId}
        onSelectSpace={setSelectedSpaceId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        bookmarks={bookmarks}
        getActiveColumnsForSpace={getActiveColumnsForSpace}
        onCreateSpace={handleCreateSpace}
        onRenameSpace={handleRenameSpace}
        onDeleteSpace={handleDeleteSpace}
        onRenameColumn={handleRenameColumn}
        onDeleteColumn={handleDeleteColumn}
        onCategoryClick={(spaceId, colName) => {
          setSelectedSpaceId(spaceId);
          setPendingScrollColumn(colName);
        }}
      />

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

      {/* 4. REUSABLE CUSTOM MODAL */}
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
