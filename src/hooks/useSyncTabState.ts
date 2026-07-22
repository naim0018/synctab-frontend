import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  User,
  LinkedGoogleAccount,
  Note,
  Task,
  Bookmark,
  Reminder,
  Message,
  Wallpaper
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const unpackJson = async (res: Response) => {
  const json = await res.json();
  if (json && typeof json === 'object' && 'data' in json && 'statusCode' in json) {
    return json.data;
  }
  return json;
};

const unpackError = async (res: Response, defaultMsg = 'An error occurred') => {
  try {
    const json = await res.json();
    if (json && typeof json === 'object' && 'message' in json) {
      return json.message;
    }
    return defaultMsg;
  } catch {
    return defaultMsg;
  }
};

const isStaleSessionError = (msg: string) =>
  /user not found|not found|invalid session/i.test(msg);

const WALLPAPERS = [
  { id: 'yosemite', name: 'Yosemite Mountain', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' },
  { id: 'forest', name: 'Mystic Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80' },
  { id: 'cyberpunk', name: 'Neon Cyberpunk', url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=1920&q=80' },
  { id: 'ocean', name: 'Tranquil Ocean', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80' },
  { id: 'space', name: 'Nebula Space', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1920&q=80' }
];

export function useSyncTabState() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Custom Pages states
  const [customPages, setCustomPages] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('synctab-custom-pages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCustomPageModalOpen, setIsCustomPageModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('synctab-custom-pages', JSON.stringify(customPages));
  }, [customPages]);

  // Sidebar drag-and-drop state
  const [leftMenuItems, setLeftMenuItems] = useState<string[]>(() => {
    const defaults = ['dashboard', 'bookmarks', 'notes', 'customize', 'widgets', 'edit_widgets', 'issues'];
    try {
      const saved = localStorage.getItem('synctab-left-menu-items');
      if (saved) {
        const lefts = JSON.parse(saved);
        const savedRight = localStorage.getItem('synctab-right-menu-items');
        const rights = savedRight ? JSON.parse(savedRight) : ['tasks', 'reminders', 'chat'];
        defaults.forEach(k => {
          if (!lefts.includes(k) && !rights.includes(k)) {
            lefts.push(k);
          }
        });
        return lefts;
      }
    } catch {}
    return defaults;
  });

  const [rightMenuItems, setRightMenuItems] = useState<string[]>(() => {
    const defaults = ['tasks', 'reminders', 'chat'];
    try {
      const saved = localStorage.getItem('synctab-right-menu-items');
      if (saved) {
        const rights = JSON.parse(saved);
        const savedLeft = localStorage.getItem('synctab-left-menu-items');
        const lefts = savedLeft ? JSON.parse(savedLeft) : ['dashboard', 'bookmarks', 'notes', 'customize', 'widgets', 'edit_widgets', 'issues'];
        defaults.forEach(k => {
          if (!lefts.includes(k) && !rights.includes(k)) {
            rights.push(k);
          }
        });
        return rights;
      }
    } catch {}
    return defaults;
  });

  const [isWidgetEditing, setIsWidgetEditing] = useState(false);
  const [isWidgetPanelOpen, setIsWidgetPanelOpen] = useState(false);
  const [draggingOverSide, setDraggingOverSide] = useState<'left' | 'right' | null>(null);

  const handleMenuDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSidebarDrop = (e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    setDraggingOverSide(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) return;

    let newLeft = leftMenuItems.filter(id => id !== sourceId);
    let newRight = rightMenuItems.filter(id => id !== sourceId);

    if (side === 'left') {
      newLeft.push(sourceId);
    } else {
      newRight.push(sourceId);
    }

    setLeftMenuItems(newLeft);
    setRightMenuItems(newRight);
    localStorage.setItem('synctab-left-menu-items', JSON.stringify(newLeft));
    localStorage.setItem('synctab-right-menu-items', JSON.stringify(newRight));

    const settingsStr = JSON.stringify({ left: newLeft, right: newRight });
    saveThemeSettings({ sidebarSettings: settingsStr });
  };

  const handleMenuDropOnItem = (e: React.DragEvent, targetId: string, targetSide: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverSide(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    let newLeft = leftMenuItems.filter(id => id !== sourceId);
    let newRight = rightMenuItems.filter(id => id !== sourceId);

    if (targetSide === 'left') {
      const idx = newLeft.indexOf(targetId);
      if (idx !== -1) {
        newLeft.splice(idx, 0, sourceId);
      } else {
        newLeft.push(sourceId);
      }
    } else {
      const idx = newRight.indexOf(targetId);
      if (idx !== -1) {
        newRight.splice(idx, 0, sourceId);
      } else {
        newRight.push(sourceId);
      }
    }

    setLeftMenuItems(newLeft);
    setRightMenuItems(newRight);
    localStorage.setItem('synctab-left-menu-items', JSON.stringify(newLeft));
    localStorage.setItem('synctab-right-menu-items', JSON.stringify(newRight));

    const settingsStr = JSON.stringify({ left: newLeft, right: newRight });
    saveThemeSettings({ sidebarSettings: settingsStr });
  };

  // Customize & Wallpaper states
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    return localStorage.getItem('synctab-wallpaper') || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80';
  });
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(() => {
    try {
      const saved = localStorage.getItem('synctab-wallpapers-list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return WALLPAPERS;
  });
  const [customGreeting, setCustomGreeting] = useState(() => {
    return localStorage.getItem('synctab-custom-greeting') || '';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('synctab-accent-color') || '#8b5cf6';
  });
  const [blurIntensity, setBlurIntensity] = useState(() => {
    return localStorage.getItem('synctab-blur-intensity') || '20px';
  });
  const [clockFormat24h, setClockFormat24h] = useState(() => {
    return localStorage.getItem('synctab-clock-format-24h') === 'true';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [visibleTabs, setVisibleTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('synctab-visible-tabs');
      return saved ? JSON.parse(saved) : {
        bookmarks: true,
        notes: true,
        tasks: true,
        reminders: true,
        chat: true
      };
    } catch {
      return {
        bookmarks: true,
        notes: true,
        tasks: true,
        reminders: true,
        chat: true
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('synctab-visible-tabs', JSON.stringify(visibleTabs));
  }, [visibleTabs]);

  const handleToggleTab = (key: 'bookmarks' | 'notes' | 'tasks' | 'reminders' | 'chat', value: boolean) => {
    setVisibleTabs((prev: any) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    localStorage.setItem('synctab-wallpaper', currentWallpaper);
    document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url('${currentWallpaper}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  }, [currentWallpaper]);

  useEffect(() => {
    localStorage.setItem('synctab-custom-greeting', customGreeting);
  }, [customGreeting]);

  useEffect(() => {
    localStorage.setItem('synctab-clock-format-24h', String(clockFormat24h));
  }, [clockFormat24h]);

  // Database lists
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const saveThemeSettings = async (updates: { accentColor?: string; blurIntensity?: string; clockFormat24h?: boolean; sidebarSettings?: string }) => {
    if (!currentUser || !isOnline) return;
    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updatedUser = await unpackJson(res);
        const cached = localStorage.getItem('synctab_user');
        if (cached) {
          const cachedUser = JSON.parse(cached);
          const newCached = { ...cachedUser, ...updates };
          localStorage.setItem('synctab_user', JSON.stringify(newCached));
        }
        setCurrentUser(updatedUser);
      }
    } catch (e) {
      console.error('Failed to sync theme settings with database:', e);
    }
  };

  const handleUpdateAccentColor = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('synctab-accent-color', color);
    saveThemeSettings({ accentColor: color });
  };

  const handleUpdateBlurIntensity = (intensity: string) => {
    setBlurIntensity(intensity);
    localStorage.setItem('synctab-blur-intensity', intensity);
    saveThemeSettings({ blurIntensity: intensity });
  };

  const handleUpdateClockFormat = (is24h: boolean) => {
    setClockFormat24h(is24h);
    localStorage.setItem('synctab-clock-format-24h', String(is24h));
    saveThemeSettings({ clockFormat24h: is24h });
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.accentColor) {
        setAccentColor(currentUser.accentColor);
        localStorage.setItem('synctab-accent-color', currentUser.accentColor);
      }
      if (currentUser.blurIntensity) {
        setBlurIntensity(currentUser.blurIntensity);
        localStorage.setItem('synctab-blur-intensity', currentUser.blurIntensity);
      }
      if (currentUser.clockFormat24h !== undefined) {
        setClockFormat24h(currentUser.clockFormat24h);
        localStorage.setItem('synctab-clock-format-24h', String(currentUser.clockFormat24h));
      }
      if (currentUser.sidebarSettings) {
        try {
          const parsed = JSON.parse(currentUser.sidebarSettings);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.left) && Array.isArray(parsed.right)) {
              const lefts = [...parsed.left];
              const rights = [...parsed.right];
              
              // Reconcile default left and right menu items
              const defaultLefts = ['dashboard', 'bookmarks', 'notes', 'customize', 'widgets', 'edit_widgets', 'issues'];
              defaultLefts.forEach(k => {
                if (!lefts.includes(k) && !rights.includes(k)) {
                  lefts.push(k);
                }
              });

              const defaultRights = ['tasks', 'reminders', 'chat'];
              defaultRights.forEach(k => {
                if (!lefts.includes(k) && !rights.includes(k)) {
                  rights.push(k);
                }
              });

              customPages.forEach(p => {
                if (!lefts.includes(p.id) && !rights.includes(p.id)) {
                  lefts.push(p.id);
                }
              });
              setLeftMenuItems(lefts);
              setRightMenuItems(rights);
              localStorage.setItem('synctab-left-menu-items', JSON.stringify(lefts));
              localStorage.setItem('synctab-right-menu-items', JSON.stringify(rights));
            } else {
              const lefts: string[] = [];
              const rights: string[] = [];
              const allKeys = ['dashboard', 'bookmarks', 'notes', 'customize', 'widgets', 'edit_widgets', 'tasks', 'reminders', 'chat', 'issues'];
              allKeys.forEach(k => {
                const side = parsed[k];
                if (side === 'right' || (side === undefined && ['tasks', 'reminders', 'chat'].includes(k))) {
                  rights.push(k);
                } else {
                  lefts.push(k);
                }
              });
              customPages.forEach(page => {
                if (parsed[page.id] === 'right') {
                  rights.push(page.id);
                } else {
                  lefts.push(page.id);
                }
              });
              setLeftMenuItems(lefts);
              setRightMenuItems(rights);
              localStorage.setItem('synctab-left-menu-items', JSON.stringify(lefts));
              localStorage.setItem('synctab-right-menu-items', JSON.stringify(rights));
            }
          }
        } catch (e) {
          console.error('Failed to parse sidebarSettings:', e);
        }
      }
    }
  }, [currentUser]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [_messages, setMessages] = useState<Message[]>([]);

  // Modals state
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);

  // Saving state indicator for notes
  const [noteSavingStatus, setNoteSavingStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Authentication states
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Profile editing state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Linked Google Accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedGoogleAccount[]>([]);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkGoogleMsg, setLinkGoogleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Connect to APIs and WebSockets
  useEffect(() => {
    initApp();

    const socket = io(API_BASE);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsOnline(true);
    });

    socket.on('disconnect', () => {
      setIsOnline(false);
    });

    socket.on('presence_updated', (data: { userId: string; name: string; status: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, status: data.status } : u))
      );
      setCurrentUser((prev) =>
        prev && prev.id === data.userId ? { ...prev, status: data.status } : prev
      );
    });

    socket.on('message_received', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('note_updated', (data: { action: string; note: Note }) => {
      const { action, note } = data;
      if (action === 'create') {
        setNotes((prev) => {
          if (prev.some((n) => n.id === note.id)) return prev;
          return [note, ...prev];
        });
      } else if (action === 'update') {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
        setSelectedNote((prev) => (prev && prev.id === note.id ? note : prev));
      } else if (action === 'delete') {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        setSelectedNote((prev) => (prev && prev.id === note.id ? null : prev));
      }
    });

    socket.on('task_updated', (data: { action: string; task: Task }) => {
      const { action, task } = data;
      if (action === 'create') {
        setTasks((prev) => {
          if (prev.some((t) => t.id === task.id)) return prev;
          return [task, ...prev];
        });
      } else if (action === 'update') {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      } else if (action === 'delete') {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }
    });

    socket.on('bookmark_updated', (data: { action: string; bookmark: Bookmark }) => {
      const { action, bookmark } = data;
      if (action === 'create') {
        setBookmarks((prev) => {
          if (prev.some((b) => b.id === bookmark.id)) return prev;
          return [bookmark, ...prev];
        });
      } else if (action === 'update') {
        setBookmarks((prev) => prev.map((b) => (b.id === bookmark.id ? bookmark : b)));
      } else if (action === 'delete') {
        setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch reminders whenever current user changes
  useEffect(() => {
    if (currentUser) {
      fetchReminders();
    }
  }, [currentUser]);

  // Listen to quick-added bookmarks in widgets
  useEffect(() => {
    const handleRefresh = () => {
      if (currentUser) {
        fetchBookmarks(currentUser);
      }
    };
    window.addEventListener('synctab-refresh-bookmarks', handleRefresh);
    return () => window.removeEventListener('synctab-refresh-bookmarks', handleRefresh);
  }, [currentUser]);

  const initApp = async () => {
    setLoading(true);
    try {
      const resUsers = await fetch(`${API_BASE}/users`);
      if (!resUsers.ok) throw new Error('API server down');
      const usersData: User[] = await unpackJson(resUsers);
      setUsers(usersData);

      const cached = localStorage.getItem('synctab_user');
      let activeUser: User | null = null;
      if (cached) {
        try {
          const cachedUser = JSON.parse(cached) as User;
          const serverUser = usersData.find((u) => u.id === cachedUser.id);
          if (serverUser) {
            activeUser = serverUser;
            setCurrentUser(serverUser);
            localStorage.setItem('synctab_user', JSON.stringify(serverUser));
          } else {
            console.warn('SyncTab: session invalid clearing session.');
            localStorage.removeItem('synctab_user');
            setCurrentUser(null);
          }
        } catch {
          localStorage.removeItem('synctab_user');
          setCurrentUser(null);
        }
      }

      if (activeUser) {
        await Promise.all([
          fetchNotes(activeUser),
          fetchBookmarks(activeUser),
          fetchTasks(),
          fetchChatMessages(),
          fetchCustomWallpapers(activeUser)
        ]);
      } else {
        setCurrentUser(null);
      }

      setIsOnline(true);
    } catch (err) {
      console.error('Offline Demo Mode fallback', err);
      setIsOnline(false);
      setupMockData();
    } finally {
      setLoading(false);
    }
  };

  const setupMockData = () => {
    const mockUsers: User[] = [
      { id: '1', name: 'Sarah Connor', email: 'sarah@skynet.com', avatar: 'avatar-1', status: 'Active' },
      { id: '2', name: 'John Doe', email: 'john@office.com', avatar: 'avatar-2', status: 'In Meeting' },
      { id: '3', name: 'Jane Smith', email: 'jane@corporate.com', avatar: 'avatar-3', status: 'Away' },
      { id: '4', name: 'Alice Johnson', email: 'alice@design.com', avatar: 'avatar-4', status: 'Active' }
    ];
    setUsers(mockUsers);

    const cached = localStorage.getItem('synctab_user');
    if (cached) {
      setCurrentUser(JSON.parse(cached));
    } else {
      setCurrentUser(null);
    }

    const mockBookmarks: Bookmark[] = [
      { id: 'b1', title: 'Office Portal', url: 'https://office.com', category: 'Work', clicks: 12, isShared: true, userId: '1' },
      { id: 'b2', title: 'Company GitHub', url: 'https://github.com', category: 'Development', clicks: 24, isShared: true, userId: '2' },
      { id: 'b3', title: 'Figma Designs', url: 'https://figma.com', category: 'Design', clicks: 18, isShared: true, userId: '4' },
      { id: 'b4', title: 'SyncTab Issues', url: 'https://github.com/issues', category: 'Development', clicks: 5, isShared: true, userId: '3' },
      { id: 'b5', title: 'My Personal Hub', url: 'https://news.ycombinator.com', category: 'Tech News', clicks: 3, isShared: false, userId: '2' }
    ];
    setBookmarks(mockBookmarks);

    const mockNotes: Note[] = [
      {
        id: 'n1',
        title: '📌 Team Standup Meeting Notes',
        content: `### Standup Notes\n\n- Sarah: Finalize the client dashboard layout.\n- John: Investigate NestJS connection drops.\n- Alice: Style the custom bookmarks section.\n\n*Next meeting tomorrow at 9:30 AM.*`,
        isShared: true,
        userId: '1',
        updatedAt: new Date().toISOString(),
        user: { id: '1', name: 'Sarah Connor', avatar: 'avatar-1' }
      },
      {
        id: 'n2',
        title: '🚀 Q3 Launch Checklist',
        content: `### Q3 Deliverables\n\n1. [x] Setup database models\n2. [x] Write seed scripts\n3. [ ] Implement beautiful UI widgets\n4. [ ] Build Chrome extension manifest V3\n5. [ ] Release beta to core team`,
        isShared: true,
        userId: '4',
        updatedAt: new Date().toISOString(),
        user: { id: '4', name: 'Alice Johnson', avatar: 'avatar-4' }
      },
      {
        id: 'n3',
        title: 'Private: Coffee orders & receipts',
        content: `- Espresso for John\n- Double Macchiato for Sarah\n- Iced Latte for Alice`,
        isShared: false,
        userId: '2',
        updatedAt: new Date().toISOString(),
        user: { id: '2', name: 'John Doe', avatar: 'avatar-2' }
      }
    ];
    setNotes(mockNotes);
    setSelectedNote(mockNotes[0]);

    const mockTasks: Task[] = [
      {
        id: 't1',
        title: 'Design sleek glassmorphism UI dashboard',
        description: 'Create the primary dashboard layout with blur effects, vibrant dark/light toggle and custom icons.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: null,
        creatorId: '1',
        assigneeId: '4',
        assignee: mockUsers[3],
        creator: mockUsers[0]
      },
      {
        id: 't2',
        title: 'Deploy backend API to staging server',
        description: 'Host the NestJS SQLite backend and expose public port with proper SSL.',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: null,
        creatorId: '1',
        assigneeId: '2',
        assignee: mockUsers[1],
        creator: mockUsers[0]
      },
      {
        id: 't3',
        title: 'Write project README and onboarding documentation',
        description: 'Detailed steps to install and load the extension in developer mode.',
        status: 'TODO',
        priority: 'LOW',
        dueDate: null,
        creatorId: '3',
        assigneeId: '1',
        assignee: mockUsers[0],
        creator: mockUsers[2]
      }
    ];
    setTasks(mockTasks);

    const mockReminders: Reminder[] = [
      { id: 'r1', text: 'Submit weekly timesheet before Friday 5 PM', dueDate: new Date(Date.now() + 86400000).toISOString(), isCompleted: false, userId: '2' },
      { id: 'r2', text: 'Review Alice\'s pull request for widgets', dueDate: new Date(Date.now() + 14400000).toISOString(), isCompleted: false, userId: '2' }
    ];
    setReminders(mockReminders);

    const mockMessages: Message[] = [
      { id: 'm1', text: 'Hey team! Welcome to SyncTab. Feel free to chat and share notes here!', userId: '1', createdAt: new Date().toISOString(), user: mockUsers[0] },
      { id: 'm2', text: 'Thanks Sarah! The real-time updates are working incredibly fast.', userId: '2', createdAt: new Date().toISOString(), user: mockUsers[1] }
    ];
    setMessages(mockMessages);
  };

  const fetchNotes = async (user = currentUser) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/notes?userId=${user.id}`);
      const data = await unpackJson(res);
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
      }
    } catch (e) { console.error(e); }
  };

  const fetchBookmarks = async (user = currentUser) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/bookmarks?userId=${user.id}`);
      const data = await unpackJson(res);
      setBookmarks(data);
    } catch (e) { console.error(e); }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      const data = await unpackJson(res);
      setTasks(data);
    } catch (e) { console.error(e); }
  };

  const fetchReminders = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/reminders?userId=${currentUser.id}`);
      const data = await unpackJson(res);
      setReminders(data);
    } catch (e) { console.error(e); }
  };

  const fetchChatMessages = async () => {};

  const fetchCustomWallpapers = async (user = currentUser) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/wallpapers?userId=${user.id}`);
      if (res.ok) {
        const data = await unpackJson(res);
        const dbWallpapers = data.map((w: any) => ({
          id: w.id,
          name: w.name,
          url: w.url,
          isCustom: true
        }));
        setWallpapers([...WALLPAPERS, ...dbWallpapers]);
      }
    } catch (e) {
      console.error('Error fetching custom wallpapers:', e);
    }
  };

  const handleUploadWallpaper = async (file: File, name: string) => {
    if (!currentUser) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name.split('.')[0] || 'Uploaded Wallpaper');
      formData.append('userId', currentUser.id);

      const res = await fetch(`${API_BASE}/wallpapers/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      await fetchCustomWallpapers(currentUser);
      setIsUploading(false);
    } catch (e) {
      console.error('Upload error:', e);
      setUploadError('Failed to upload image. Please try again.');
      setIsUploading(false);
    }
  };

  const handleDeleteCustomWallpaper = async (wpId: string, wpUrl: string) => {
    if (!currentUser) return;
    if (currentWallpaper === wpUrl) {
      setCurrentWallpaper(WALLPAPERS[0].url);
    }
    try {
      const res = await fetch(`${API_BASE}/wallpapers/${wpId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCustomWallpapers(currentUser);
      }
    } catch (e) {
      console.error('Failed to delete wallpaper:', e);
    }
  };

  const handleAddWallpaperUrl = async (name: string, url: string) => {
    if (!currentUser) return;
    try {
      const wpName = name || 'Linked Wallpaper';
      if (isOnline) {
        const res = await fetch(`${API_BASE}/wallpapers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: wpName, url, userId: currentUser.id }),
        });
        if (res.ok) {
          await fetchCustomWallpapers(currentUser);
        }
      } else {
        const localWp: Wallpaper = {
          id: `local-wp-${Date.now()}`,
          name: wpName,
          url,
          isCustom: true
        };
        setWallpapers((prev) => [...prev, localWp]);
      }
    } catch (e) {
      console.error('Failed to save wallpaper URL:', e);
    }
  };

  const handleLogin = async (emailVal: string, passwordVal: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (!isOnline) {
        if (emailVal === 'john@office.com') {
          const mockUser = users.find((u) => u.email === emailVal) || users[0] || {
            id: '2', name: 'John Doe', email: 'john@office.com', avatar: 'avatar-2', status: 'Active'
          };
          localStorage.setItem('synctab_user', JSON.stringify(mockUser));
          setCurrentUser(mockUser);
          setupMockData();
          return;
        } else {
          throw new Error('Offline Mode: Only "john@office.com" is available as a mock email.');
        }
      }

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      if (!res.ok) {
        const errMsg = await unpackError(res, 'Invalid email or password');
        throw new Error(errMsg);
      }

      const userData = await unpackJson(res);
      localStorage.setItem('synctab_user', JSON.stringify(userData));
      setCurrentUser(userData);

      await Promise.all([
        fetchNotes(userData),
        fetchBookmarks(userData),
        fetchTasks(),
        fetchChatMessages(),
        fetchCustomWallpapers(userData)
      ]);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Login failed';
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async (email: string, name: string, avatar: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (!isOnline) {
        const mockUser = {
          id: `google-${Date.now()}`,
          name,
          email,
          avatar,
          status: 'Active'
        };
        localStorage.setItem('synctab_user', JSON.stringify(mockUser));
        setCurrentUser(mockUser);
        return;
      }

      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, avatar }),
      });

      if (!res.ok) {
        const errMsg = await unpackError(res, 'Google login failed');
        throw new Error(errMsg);
      }

      const userData = await unpackJson(res);
      localStorage.setItem('synctab_user', JSON.stringify(userData));
      setCurrentUser(userData);

      const resUsers = await fetch(`${API_BASE}/users`);
      if (resUsers.ok) {
        setUsers(await unpackJson(resUsers));
      }

      await Promise.all([
        fetchNotes(userData),
        fetchBookmarks(userData),
        fetchTasks(),
        fetchChatMessages(),
        fetchCustomWallpapers(userData)
      ]);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Google Login failed';
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('synctab_user');
    setCurrentUser(null);
    setSelectedNote(null);
    setNotes([]);
    setBookmarks([]);
    setTasks([]);
    setReminders([]);
  };

  const handleOfflineDemoLogin = () => {
    const demoUser = {
      id: '2',
      name: 'John Doe',
      email: 'john@office.com',
      avatar: 'avatar-2',
      status: 'Active'
    };
    localStorage.setItem('synctab_user', JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    setupMockData();
  };

  const handleSaveProfile = async (updates: { name?: string; email?: string; password?: string }) => {
    if (!currentUser) return;
    setProfileSaving(true);
    setProfileSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errMsg = await unpackError(res, 'Failed to update profile');
        throw new Error(errMsg);
      }

      const updatedUser = await unpackJson(res);
      setCurrentUser(updatedUser);
      localStorage.setItem('synctab_user', JSON.stringify(updatedUser));
      setProfileSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Failed to update profile';
      const msg = isStaleSessionError(raw)
        ? 'Your session has expired. Please sign out and sign back in.'
        : raw;
      setProfileSaveMsg({ type: 'error', text: msg });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLinkGoogleViaPopup = () => {
    if (!currentUser) return;
    setLinkGoogleMsg(null);
    setLinkingGoogle(true);

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${API_BASE}/auth/google/link?userId=${currentUser.id}`,
      'google-oauth-link',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      setLinkingGoogle(false);
      setLinkGoogleMsg({ type: 'error', text: 'Popup blocked. Please enable popups.' });
      return;
    }

    const handleMsg = async (event: MessageEvent) => {
      try {
        const apiOrigin = new URL(API_BASE).origin;
        if (event.origin !== apiOrigin) return;
      } catch (e) { return; }

      if (event.data?.type === 'GOOGLE_LINK_SUCCESS') {
        setLinkGoogleMsg({ type: 'success', text: `Google account linked successfully!` });
        await fetchLinkedAccounts();
        setLinkingGoogle(false);
        window.removeEventListener('message', handleMsg);
      } else if (event.data?.type === 'GOOGLE_LINK_FAILURE') {
        const error = event.data.error || 'Failed to link account';
        setLinkGoogleMsg({ type: 'error', text: error });
        setLinkingGoogle(false);
        window.removeEventListener('message', handleMsg);
      }
    };

    window.addEventListener('message', handleMsg);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setLinkingGoogle(false);
        window.removeEventListener('message', handleMsg);
      }
    }, 1000);
  };

  const handleLinkGoogleByEmail = async (email: string) => {
    if (!currentUser) return;
    setLinkGoogleMsg(null);
    setLinkingGoogle(true);
    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/google-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleEmail: email }),
      });
      if (!res.ok) {
        const errMsg = await unpackError(res, 'Failed to link account');
        throw new Error(errMsg);
      }
      await fetchLinkedAccounts();
      setLinkGoogleMsg({ type: 'success', text: `${email} linked!` });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Failed to link account';
      const msg = isStaleSessionError(raw)
        ? 'Session expired — please sign out and sign back in.'
        : raw;
      setLinkGoogleMsg({ type: 'error', text: msg });
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogleAccount = async (googleEmail: string) => {
    if (!currentUser) return;
    try {
      const encodedEmail = encodeURIComponent(googleEmail);
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/google-accounts/${encodedEmail}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchLinkedAccounts();
      }
    } catch (e) { console.error(e); }
  };

  const fetchLinkedAccounts = async (userId?: string) => {
    const id = userId || currentUser?.id;
    if (!id || !isOnline) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}/google-accounts`);
      if (res.ok) {
        const data = await unpackJson(res);
        setLinkedAccounts(data);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === 'customize' && currentUser && isOnline) {
      fetchLinkedAccounts();
    }
  }, [activeTab]);

  const handleStatusChange = async (status: string) => {
    if (!currentUser) return;
    const originalStatus = currentUser.status;
    const nextStatus = status;

    setCurrentUser((prev) => prev ? { ...prev, status: nextStatus } : null);
    setUsers((prev) => prev.map((u) => u.id === currentUser.id ? { ...u, status: nextStatus } : u));

    if (!isOnline) return;

    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      console.error(err);
      setCurrentUser((prev) => prev ? { ...prev, status: originalStatus } : null);
      setUsers((prev) => prev.map((u) => u.id === currentUser.id ? { ...u, status: originalStatus } : u));
    }
  };

  const handleCreateBookmark = async (bookmarkData: { title: string; url: string; category: string; isShared: boolean }) => {
    if (!currentUser) return;

    if (!isOnline) {
      const b: Bookmark = {
        id: `local-b-${Date.now()}`,
        title: bookmarkData.title,
        url: bookmarkData.url,
        category: bookmarkData.category,
        clicks: 0,
        isShared: bookmarkData.isShared,
        userId: currentUser.id
      };
      setBookmarks((prev) => [b, ...prev]);
      setIsBookmarkModalOpen(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookmarkData.title,
          url: bookmarkData.url,
          category: bookmarkData.category,
          isShared: bookmarkData.isShared,
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setIsBookmarkModalOpen(false);
        fetchBookmarks();
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateNote = async () => {
    if (!currentUser) return;
    const n: Note = {
      id: `temp-${Date.now()}`,
      title: 'Untitled Note',
      content: '',
      isShared: true,
      userId: currentUser.id,
      updatedAt: new Date().toISOString(),
      user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
    };
    setSelectedNote(n);
    setNotes((prev) => [n, ...prev]);
    setNoteSavingStatus('dirty');

    if (!isOnline) return;

    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note', content: '', isShared: true, userId: currentUser.id })
      });
      if (res.ok) {
        const createdNote = await unpackJson(res);
        setSelectedNote(createdNote);
        setNotes((prev) => prev.map((item) => item.id === n.id ? createdNote : item));
        setNoteSavingStatus('saved');
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateNote = async () => {
    if (!currentUser || !selectedNote) return;
    setNoteSavingStatus('saving');

    if (!isOnline) {
      setNotes((prev) => prev.map((n) => n.id === selectedNote.id ? { ...selectedNote, updatedAt: new Date().toISOString() } : n));
      setNoteSavingStatus('saved');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/notes/${selectedNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: selectedNote.title, content: selectedNote.content, isShared: selectedNote.isShared })
      });
      if (res.ok) {
        const updated = await unpackJson(res);
        setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
        setNoteSavingStatus('saved');
      }
    } catch (e) {
      console.error(e);
      setNoteSavingStatus('dirty');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }

    if (!isOnline) return;

    try {
      await fetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const handleCreateTask = async (taskData: { title: string; description: string; priority: string; assigneeId: string; dueDate: string }) => {
    if (!currentUser) return;

    if (!isOnline) {
      const assigneeUser = users.find((u) => u.id === taskData.assigneeId) || null;
      const t: Task = {
        id: `local-t-${Date.now()}`,
        title: taskData.title,
        description: taskData.description || '',
        status: 'TODO',
        priority: taskData.priority,
        dueDate: taskData.dueDate || null,
        creatorId: currentUser.id,
        assigneeId: taskData.assigneeId || null,
        assignee: assigneeUser,
        creator: currentUser
      };
      setTasks((prev) => [t, ...prev]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          status: 'TODO',
          priority: taskData.priority,
          creatorId: currentUser.id,
          assigneeId: taskData.assigneeId || undefined,
          dueDate: taskData.dueDate || undefined
        })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (e) { console.error(e); }
  };

  const handleTaskStatusMove = async (task: Task, nextStatus: string) => {
    if (!currentUser) return;

    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t));

    if (!isOnline) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        throw new Error('Failed to update task status');
      }
    } catch (e) {
      console.error(e);
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (!isOnline) return;
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const handleCreateReminder = async (text: string, time: string) => {
    if (!currentUser) return;

    if (!isOnline) {
      const r: Reminder = {
        id: `local-r-${Date.now()}`,
        text: text,
        dueDate: new Date(time).toISOString(),
        isCompleted: false,
        userId: currentUser.id
      };
      setReminders((prev) => [...prev, r].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          dueDate: new Date(time).toISOString(),
          userId: currentUser.id
        })
      });
      if (res.ok) {
        fetchReminders();
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleReminder = async (reminderId: string) => {
    const rem = reminders.find((r) => r.id === reminderId);
    if (!rem) return;

    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r))
    );

    if (!isOnline) return;

    try {
      await fetch(`${API_BASE}/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !rem.isCompleted })
      });
    } catch (e) { console.error(e); }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    if (!isOnline) return;
    try {
      await fetch(`${API_BASE}/reminders/${reminderId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const handleDeleteCustomPage = (id: string) => {
    const page = customPages.find(p => p.id === id);
    if (!page) return;
    if (confirm(`Are you sure you want to delete custom page "${page.name}"?`)) {
      setCustomPages(prev => prev.filter(p => p.id !== id));
      setLeftMenuItems(prev => {
        const next = prev.filter(item => item !== id);
        localStorage.setItem('synctab-left-menu-items', JSON.stringify(next));
        const settingsStr = JSON.stringify({ left: next, right: rightMenuItems });
        saveThemeSettings({ sidebarSettings: settingsStr });
        return next;
      });
      setRightMenuItems(prev => {
        const next = prev.filter(item => item !== id);
        localStorage.setItem('synctab-right-menu-items', JSON.stringify(next));
        const settingsStr = JSON.stringify({ left: leftMenuItems.filter(item => item !== id), right: next });
        saveThemeSettings({ sidebarSettings: settingsStr });
        return next;
      });
      setActiveTab('dashboard');
    }
  };

  return {
    activeTab,
    setActiveTab,
    isDarkMode,
    setIsDarkMode,
    isOnline,
    loading,
    customPages,
    setCustomPages,
    isCustomPageModalOpen,
    setIsCustomPageModalOpen,
    leftMenuItems,
    setLeftMenuItems,
    rightMenuItems,
    setRightMenuItems,
    isWidgetEditing,
    setIsWidgetEditing,
    isWidgetPanelOpen,
    setIsWidgetPanelOpen,
    draggingOverSide,
    setDraggingOverSide,
    handleMenuDragStart,
    handleSidebarDrop,
    handleMenuDropOnItem,
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
    saveThemeSettings,
    fetchNotes,
    fetchTasks,
    fetchCustomWallpapers,
    setCustomGreeting,
    handleDeleteCustomWallpaper,
    handleUploadWallpaper,
    handleAddWallpaperUrl
  };
}
