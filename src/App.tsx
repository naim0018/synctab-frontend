import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Bookmark as BookmarkIcon,
  Plus,
  Trash2,
  Save,
  FileText,
  CheckSquare,
  MessageSquare,
  Clock,
  Globe,
  Check,
  Sun,
  Moon,
  ChevronRight,
  X,
  Search,
  Edit2,
  LogOut,
  Sliders,
  UploadCloud,
  Palette,
  Layout,
  Image as ImageIcon
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

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

interface User {
  id: string;
  name: string;
  email: string | null;
  avatar: string;
  status: string;
  accentColor?: string;
  blurIntensity?: string;
  clockFormat24h?: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  isShared: boolean;
  userId: string;
  updatedAt: string;
  user: { id: string; name: string; avatar: string };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  creatorId: string;
  assignee?: { id: string; name: string; avatar: string } | null;
  creator?: { id: string; name: string; avatar: string };
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  clicks: number;
  isShared: boolean;
  userId: string;
}

interface Reminder {
  id: string;
  text: string;
  dueDate: string;
  isCompleted: boolean;
  userId: string;
}

interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string };
}

const WALLPAPERS = [
  { id: 'yosemite', name: 'Yosemite Mountain', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' },
  { id: 'forest', name: 'Mystic Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80' },
  { id: 'cyberpunk', name: 'Neon Cyberpunk', url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=1920&q=80' },
  { id: 'ocean', name: 'Tranquil Ocean', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80' },
  { id: 'space', name: 'Nebula Space', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1920&q=80' }
];

function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookmarks' | 'notes' | 'tasks' | 'reminders' | 'chat' | 'customize'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Customize & Wallpaper states
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    return localStorage.getItem('synctab-wallpaper') || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80';
  });
  const [wallpapers, setWallpapers] = useState<{ id: string; name: string; url: string; isCustom?: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('synctab-wallpapers-list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return WALLPAPERS;
  });
  const [customGreeting, setCustomGreeting] = useState(() => {
    return localStorage.getItem('synctab-custom-greeting') || '';
  });
  const [customWpName, setCustomWpName] = useState('');
  const [customWpUrl, setCustomWpUrl] = useState('');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadWallpaper(file, customWpName.trim());
      setCustomWpName('');
    }
  };

  const handleAddCustomWallpaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWpUrl.trim()) return;
    const name = customWpName.trim() || `Custom Wallpaper ${wallpapers.length - 4}`;
    const newWp = {
      id: `custom-${Date.now()}`,
      name,
      url: customWpUrl.trim()
    };
    const updated = [...wallpapers, newWp];
    setWallpapers(updated);
    setCurrentWallpaper(newWp.url);
    setCustomWpName('');
    setCustomWpUrl('');
  };

  useEffect(() => {
    localStorage.setItem('synctab-wallpapers-list', JSON.stringify(wallpapers));
  }, [wallpapers]);

  useEffect(() => {
    localStorage.setItem('synctab-custom-greeting', customGreeting);
  }, [customGreeting]);

  useEffect(() => {
    localStorage.setItem('synctab-visible-tabs', JSON.stringify(visibleTabs));
  }, [visibleTabs]);

  useEffect(() => {
    document.body.style.backgroundImage = isDarkMode 
      ? `linear-gradient(rgba(6, 7, 10, 0.4), rgba(6, 7, 10, 0.85)), url('${currentWallpaper}')`
      : `linear-gradient(rgba(248, 250, 252, 0.65), rgba(248, 250, 252, 0.9)), url('${currentWallpaper}')`;
    
    localStorage.setItem('synctab-wallpaper', currentWallpaper);
  }, [currentWallpaper, isDarkMode]);

  useEffect(() => {
    if (activeTab === 'bookmarks' && !visibleTabs.bookmarks) setActiveTab('dashboard');
    if (activeTab === 'notes' && !visibleTabs.notes) setActiveTab('dashboard');
    if (activeTab === 'tasks' && !visibleTabs.tasks) setActiveTab('dashboard');
    if (activeTab === 'reminders' && !visibleTabs.reminders) setActiveTab('dashboard');
    if (activeTab === 'chat' && !visibleTabs.chat) setActiveTab('dashboard');
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor);
    let glow = 'rgba(139, 92, 246, 0.4)';
    let hover = '#a78bfa';
    if (accentColor === '#10b981') {
      glow = 'rgba(16, 185, 129, 0.4)';
      hover = '#34d399';
    } else if (accentColor === '#3b82f6') {
      glow = 'rgba(59, 130, 246, 0.4)';
      hover = '#60a5fa';
    } else if (accentColor === '#f97316') {
      glow = 'rgba(249, 115, 22, 0.4)';
      hover = '#fb923c';
    } else if (accentColor === '#ec4899') {
      glow = 'rgba(236, 72, 153, 0.4)';
      hover = '#f472b6';
    }
    document.documentElement.style.setProperty('--primary-glow', glow);
    document.documentElement.style.setProperty('--primary-hover', hover);
    localStorage.setItem('synctab-accent-color', accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--blur-amount', blurIntensity);
    localStorage.setItem('synctab-blur-intensity', blurIntensity);
  }, [blurIntensity]);

  useEffect(() => {
    localStorage.setItem('synctab-clock-format-24h', String(clockFormat24h));
  }, [clockFormat24h]);

  // Database lists
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const saveThemeSettings = async (updates: { accentColor?: string; blurIntensity?: string; clockFormat24h?: boolean }) => {
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
    }
  }, [currentUser]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Bookmark sorting/categories
  const [selectedBookmarkCat, setSelectedBookmarkCat] = useState<string>('All');
  
  // Modals state
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Form states
  const [newBookmark, setNewBookmark] = useState({ title: '', url: '', category: 'Work', isShared: true });
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  // Saving state indicator for notes
  const [noteSavingStatus, setNoteSavingStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Time & Date state
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Authentication states
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'google'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAvatar, setAuthAvatar] = useState('avatar-1');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isGoogleSimOpen, setIsGoogleSimOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside profile dropdown handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        const trigger = document.querySelector('.widget-profile-btn');
        if (trigger && trigger.contains(event.target as Node)) {
          return;
        }
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Time ticker
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !clockFormat24h }));
      setDateStr(d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [clockFormat24h]);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
    }
  }, [isDarkMode]);

  // Google login is handled dynamically via handleGoogleLoginClick popup flow

  // Connect to APIs and WebSockets
  useEffect(() => {
    // Initial fetch
    initApp();

    // Socket.io Connection
    const socket = io(API_BASE);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsOnline(true);
    });

    socket.on('disconnect', () => {
      setIsOnline(false);
    });

    // Real-time Event Subscriptions
    socket.on('presence_updated', (data: { userId: string; name: string; status: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, status: data.status } : u))
      );
      // Update simulated currentUser status if matching
      setCurrentUser((prev) =>
        prev && prev.id === data.userId ? { ...prev, status: data.status } : prev
      );
    });

    socket.on('message_received', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch reminders whenever current user changes
  useEffect(() => {
    if (currentUser) {
      fetchReminders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Scroll chat to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll chat to bottom when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [activeTab]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const resUsers = await fetch(`${API_BASE}/users`);
      if (!resUsers.ok) throw new Error('API server down');
      const usersData: User[] = await unpackJson(resUsers);
      setUsers(usersData);

      // Restore user session from localStorage if exists
      const cached = localStorage.getItem('synctab_user');
      let activeUser: User | null = null;
      if (cached) {
        const cachedUser = JSON.parse(cached) as User;
        const matchedUser = usersData.find((u) => u.id === cachedUser.id);
        if (matchedUser) {
          activeUser = matchedUser;
          setCurrentUser(matchedUser);
        }
      }

      if (activeUser) {
        // 2. Fetch user-specific and workspace data
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
      console.error('Error fetching data from SyncTab Backend, running in Offline Demo Mode', err);
      setIsOnline(false);
      setupMockData();
    } finally {
      setLoading(false);
    }
  };

  // Mock fallbacks if backend server isn't running
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

  // ==================== API FETCHERS ====================

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

  const fetchChatMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      const data = await unpackJson(res);
      setMessages(data);
      scrollToBottom();
    } catch (e) { console.error(e); }
  };

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

      const newWp = await unpackJson(res);
      const updatedWp = {
        id: newWp.id,
        name: newWp.name,
        url: newWp.url,
        isCustom: true
      };

      setWallpapers((prev) => [...prev, updatedWp]);
      setCurrentWallpaper(newWp.url);
    } catch (err: any) {
      console.error(err);
      setUploadError('Failed to upload image. Using local offline fallback.');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const localUrl = reader.result as string;
        const fallbackWp = {
          id: `local-fallback-${Date.now()}`,
          name: name || file.name.split('.')[0] || 'Uploaded Wallpaper (Local)',
          url: localUrl,
          isCustom: true
        };
        setWallpapers((prev) => [...prev, fallbackWp]);
        setCurrentWallpaper(localUrl);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCustomWallpaper = async (wpId: string, wpUrl: string) => {
    try {
      if (!wpId.startsWith('local-fallback-')) {
        await fetch(`${API_BASE}/wallpapers/${wpId}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.error('Failed to delete wallpaper from DB:', e);
    }

    const updated = wallpapers.filter((w) => w.id !== wpId);
    setWallpapers(updated);

    if (currentWallpaper === wpUrl) {
      setCurrentWallpaper(WALLPAPERS[0].url);
    }
  };

  // ==================== AUTHENTICATION HANDLERS ====================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (!isOnline) {
        // Offline login simulation
        if (authEmail === 'john@office.com') {
          const mockUser = users.find((u) => u.email === authEmail) || users[0] || {
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
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      
      if (!res.ok) {
        const errMsg = await unpackError(res, 'Invalid email or password');
        throw new Error(errMsg);
      }

      const userData = await unpackJson(res);
      localStorage.setItem('synctab_user', JSON.stringify(userData));
      setCurrentUser(userData);
      
      // Load user data
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (!isOnline) {
        throw new Error('Database is offline. Registration is disabled.');
      }

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
          avatar: authAvatar,
        }),
      });

      if (!res.ok) {
        const errMsg = await unpackError(res, 'Registration failed');
        throw new Error(errMsg);
      }

      const userData = await unpackJson(res);
      localStorage.setItem('synctab_user', JSON.stringify(userData));
      setCurrentUser(userData);

      // Refresh users list
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
      const errMsg = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLoginClick = () => {
    setAuthError('');
    setAuthLoading(true);

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${API_BASE}/auth/google/login`,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      setAuthLoading(false);
      setAuthError('Popup blocked. Please allow popups for Google Sign-In.');
      return;
    }

    const handleMessage = async (event: MessageEvent) => {
      try {
        const apiOrigin = new URL(API_BASE).origin;
        if (event.origin !== apiOrigin) return;
      } catch (e) {
        return;
      }

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const userData = event.data.user;
        localStorage.setItem('synctab_user', JSON.stringify(userData));
        setCurrentUser(userData);

        try {
          // Refresh users list
          const resUsers = await fetch(`${API_BASE}/users`);
          if (resUsers.ok) {
            setUsers(await unpackJson(resUsers));
          }

          // Fetch app data for the logged in user
          await Promise.all([
            fetchNotes(userData),
            fetchBookmarks(userData),
            fetchTasks(),
            fetchChatMessages(),
            fetchCustomWallpapers(userData)
          ]);
        } catch (err) {
          console.error(err);
        }
        
        setAuthLoading(false);
        window.removeEventListener('message', handleMessage);
      } else if (event.data?.type === 'GOOGLE_AUTH_FAILURE') {
        const errMsg = event.data.error || 'Google Sign-In failed.';
        if (errMsg.includes('not configured')) {
          // Fall back to simulated login dialog
          setIsGoogleSimOpen(true);
        } else {
          setAuthError(errMsg);
        }
        setAuthLoading(false);
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setAuthLoading(false);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };

  const handleGoogleLogin = async (email: string, name: string, avatar: string) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (!isOnline) {
        // Offline Google Login simulation
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

      // Refresh users list
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
      setIsGoogleSimOpen(false);
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

  // ==================== USER Presences ====================

  const handleStatusChange = async (status: string) => {
    if (!currentUser) return;
    if (!isOnline) {
      // Local fallback
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, status } : u)));
      setCurrentUser((prev) => prev ? { ...prev, status } : null);
      return;
    }
    try {
      await fetch(`${API_BASE}/users/${currentUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) { console.error(e); }
  };

  // ==================== BOOKMARK CRUD ====================

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newBookmark.title || !newBookmark.url) return;

    if (!isOnline) {
      const b: Bookmark = {
        id: `local-b-${Date.now()}`,
        title: newBookmark.title,
        url: newBookmark.url,
        category: newBookmark.category,
        clicks: 0,
        isShared: newBookmark.isShared,
        userId: currentUser.id
      };
      setBookmarks((prev) => [b, ...prev]);
      setIsBookmarkModalOpen(false);
      setNewBookmark({ title: '', url: '', category: 'Work', isShared: true });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBookmark.title,
          url: newBookmark.url,
          category: newBookmark.category,
          isShared: newBookmark.isShared,
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setIsBookmarkModalOpen(false);
        setNewBookmark({ title: '', url: '', category: 'Work', isShared: true });
        fetchBookmarks();
      }
    } catch (e) { console.error(e); }
  };

  const handleBookmarkClick = async (bookmark: Bookmark) => {
    window.open(bookmark.url, '_blank');
    if (!isOnline) {
      setBookmarks((prev) => prev.map((b) => (b.id === bookmark.id ? { ...b, clicks: b.clicks + 1 } : b)));
      return;
    }
    try {
      await fetch(`${API_BASE}/bookmarks/${bookmark.id}/click`, { method: 'POST' });
    } catch (e) { console.error(e); }
  };

  const handleDeleteBookmark = async (bookmarkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOnline) {
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      return;
    }
    try {
      await fetch(`${API_BASE}/bookmarks/${bookmarkId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  // ==================== NOTES CRUD ====================

  const handleCreateNote = async () => {
    if (!currentUser) return;
    const placeholderTitle = 'Untitled Note';
    const placeholderContent = 'Write your thoughts here...';

    if (!isOnline) {
      const n: Note = {
        id: `local-n-${Date.now()}`,
        title: placeholderTitle,
        content: placeholderContent,
        isShared: false,
        userId: currentUser.id,
        updatedAt: new Date().toISOString(),
        user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
      };
      setNotes((prev) => [n, ...prev]);
      setSelectedNote(n);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: placeholderTitle,
          content: placeholderContent,
          isShared: false,
          userId: currentUser.id
        })
      });
      if (res.ok) {
        const data = await unpackJson(res);
        setNotes((prev) => [data, ...prev]);
        setSelectedNote(data);
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;
    setNoteSavingStatus('saving');
    
    if (!isOnline) {
      setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? selectedNote : n)));
      setNoteSavingStatus('saved');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/notes/${selectedNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedNote.title,
          content: selectedNote.content,
          isShared: selectedNote.isShared
        })
      });
      if (res.ok) {
        setNoteSavingStatus('saved');
      }
    } catch (e) {
      console.error(e);
      setNoteSavingStatus('dirty');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!isOnline) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      return;
    }
    try {
      await fetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  // ==================== TASK CRUD ====================

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newTask.title) return;

    if (!isOnline) {
      const assigneeUser = users.find((u) => u.id === newTask.assigneeId) || null;
      const t: Task = {
        id: `local-t-${Date.now()}`,
        title: newTask.title,
        description: newTask.description || '',
        status: 'TODO',
        priority: newTask.priority,
        dueDate: newTask.dueDate || null,
        creatorId: currentUser.id,
        assigneeId: newTask.assigneeId || null,
        assignee: assigneeUser,
        creator: currentUser
      };
      setTasks((prev) => [t, ...prev]);
      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          status: 'TODO',
          priority: newTask.priority,
          creatorId: currentUser.id,
          assigneeId: newTask.assigneeId || undefined,
          dueDate: newTask.dueDate || undefined
        })
      });
      if (res.ok) {
        setIsTaskModalOpen(false);
        setNewTask({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
        fetchTasks();
      }
    } catch (e) { console.error(e); }
  };

  const handleTaskStatusMove = async (task: Task, nextStatus: string) => {
    if (!isOnline) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      return;
    }
    try {
      await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!isOnline) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return;
    }
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  // ==================== REMINDERS CRUD ====================

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newReminderText || !newReminderTime) return;

    if (!isOnline) {
      const r: Reminder = {
        id: `local-r-${Date.now()}`,
        text: newReminderText,
        dueDate: new Date(newReminderTime).toISOString(),
        isCompleted: false,
        userId: currentUser.id
      };
      setReminders((prev) => [...prev, r].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setNewReminderText('');
      setNewReminderTime('');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newReminderText,
          dueDate: new Date(newReminderTime).toISOString(),
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setNewReminderText('');
        setNewReminderTime('');
        fetchReminders();
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleReminder = async (reminderId: string) => {
    if (!isOnline) {
      setReminders((prev) => prev.map((r) => (r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r)));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reminders/${reminderId}`, { method: 'PATCH' });
      if (res.ok) {
        fetchReminders();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!isOnline) {
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reminders/${reminderId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReminders();
      }
    } catch (e) { console.error(e); }
  };

  // ==================== LIVE CHAT ====================

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !chatMessage.trim()) return;

    if (!isOnline) {
      const m: Message = {
        id: `local-m-${Date.now()}`,
        text: chatMessage,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
      };
      setMessages((prev) => [...prev, m]);
      setChatMessage('');
      scrollToBottom();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chatMessage,
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setChatMessage('');
      }
    } catch (e) { console.error(e); }
  };

  // Filters bookmarks categories
  const bookmarkCategories = ['All', ...Array.from(new Set(bookmarks.map((b) => b.category)))];
  const filteredBookmarks = bookmarks.filter((b) => {
    if (selectedBookmarkCat === 'All') return true;
    return b.category === selectedBookmarkCat;
  });

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
      <div className="auth-screen-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-icon">
              <BookmarkIcon size={26} />
            </div>
            <h2 className="auth-title">SyncTab</h2>
            <p className="auth-subtitle">Empower your office tab workflow</p>
          </div>

          <div className="auth-tabs">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="auth-error-banner">
              <X size={14} style={{ flexShrink: 0 }} />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="auth-input-field"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="auth-input-field"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              <button type="submit" disabled={authLoading} className="btn-primary" style={{ padding: '12px', marginTop: '8px', fontSize: '13px', width: '100%' }}>
                {authLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="divider-container">Or Connect With</div>

              <button
                type="button"
                onClick={handleGoogleLoginClick}
                className="google-auth-btn"
                style={{ width: '100%' }}
              >
                <svg className="google-icon-svg" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.48 7.58l3.96 3.07C6.39 7.42 9.01 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.44 14.78c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.48 7.15C.53 9.07 0 11.22 0 13.5s.53 4.43 1.48 6.35l3.96-3.07z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-2.99 0-5.61-2.38-6.56-5.61l-3.96 3.07C3.37 20.32 7.35 23 12 23z"
                  />
                </svg>
                Continue with Google
              </button>

              {!isOnline && (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleOfflineDemoLogin}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                  >
                    Enter Offline Demo Mode
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="auth-input-field"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="auth-input-field"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Create password"
                  className="auth-input-field"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Select Avatar</label>
                <div className="auth-avatar-grid">
                  {['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-7', 'avatar-8'].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAuthAvatar(av)}
                      className={`auth-avatar-option ${authAvatar === av ? 'selected' : ''}`}
                    >
                      <div className={`avatar-circle ${av}`} style={{ width: '36px', height: '36px', fontSize: '12px', cursor: 'pointer' }}>
                        {authName ? authName.charAt(0) : 'A'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={authLoading} className="btn-primary" style={{ padding: '12px', marginTop: '12px', fontSize: '13px', width: '100%' }}>
                {authLoading ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>
          )}
        </div>

        {/* MOCK GOOGLE LOGIN DIALOG SIMULATION */}
        {isGoogleSimOpen && (
          <div className="google-sim-modal-overlay">
            <div className="google-sim-card">
              <div className="google-sim-header">
                <svg className="google-icon-svg" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.48 7.58l3.96 3.07C6.39 7.42 9.01 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.44 14.78c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.48 7.15C.53 9.07 0 11.22 0 13.5s.53 4.43 1.48 6.35l3.96-3.07z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-2.99 0-5.61-2.38-6.56-5.61l-3.96 3.07C3.37 20.32 7.35 23 12 23z"
                  />
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginTop: '8px' }}>Sign in with Google</h3>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Choose a simulated account to connect to SyncTab</p>
              </div>

              <div className="google-sim-accounts">
                {[
                  { name: 'Sarah Connor', email: 'sarah@skynet.com', avatar: 'avatar-1', bg: '#fee2e2', text: '#991b1b' },
                  { name: 'John Doe', email: 'john@office.com', avatar: 'avatar-2', bg: '#dbeafe', text: '#1e40af' },
                  { name: 'Jane Smith', email: 'jane@corporate.com', avatar: 'avatar-3', bg: '#fef3c7', text: '#92400e' },
                  { name: 'Alice Johnson', email: 'alice@design.com', avatar: 'avatar-4', bg: '#f3e8ff', text: '#6b21a8' }
                ].map((acc) => (
                  <div
                    key={acc.email}
                    onClick={() => handleGoogleLogin(acc.email, acc.name, acc.avatar)}
                    className="google-sim-account-row"
                  >
                    <div className="google-sim-avatar" style={{ background: acc.bg, color: acc.text }}>
                      {acc.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{acc.name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{acc.email}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="google-sim-custom-form">
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Or simulated custom Google login</div>
                <input
                  type="email"
                  placeholder="enter.any.email@gmail.com"
                  className="auth-input-field"
                  style={{ background: '#f9fafb', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      const email = e.currentTarget.value;
                      const parts = email.split('@');
                      const name = parts[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
                      handleGoogleLogin(email, name, 'avatar-5');
                    }
                  }}
                />
                <div style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>Press Enter to submit custom Google email</div>
              </div>

              <button
                type="button"
                onClick={() => setIsGoogleSimOpen(false)}
                className="btn-secondary"
                style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: '10px', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Left Edge Navigation */}
      <div className="edge-menu left-side">
        <div className="edge-menu-item-wrapper">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`edge-menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Globe size={20} />
          </button>
          <span className="edge-menu-label">Home</span>
        </div>
        {visibleTabs.bookmarks && (
          <div className="edge-menu-item-wrapper">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`edge-menu-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
            >
              <BookmarkIcon size={20} />
            </button>
            <span className="edge-menu-label">Bookmarks</span>
          </div>
        )}
        {visibleTabs.notes && (
          <div className="edge-menu-item-wrapper">
            <button
              onClick={() => setActiveTab('notes')}
              className={`edge-menu-btn ${activeTab === 'notes' ? 'active' : ''}`}
            >
              <FileText size={20} />
            </button>
            <span className="edge-menu-label">Notes</span>
          </div>
        )}
        {/* Customize Menu Item */}
        <div className="edge-menu-item-wrapper">
          <button
            onClick={() => setActiveTab('customize')}
            className={`edge-menu-btn ${activeTab === 'customize' ? 'active' : ''}`}
            title="Customize Dashboard"
          >
            <Sliders size={20} />
          </button>
          <span className="edge-menu-label">Customize</span>
        </div>
      </div>

      {/* Right Edge Navigation */}
      <div className="edge-menu right-side">
        {visibleTabs.tasks && (
          <div className="edge-menu-item-wrapper">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`edge-menu-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            >
              <CheckSquare size={20} />
            </button>
            <span className="edge-menu-label">Tasks</span>
          </div>
        )}
        {visibleTabs.reminders && (
          <div className="edge-menu-item-wrapper">
            <button
              onClick={() => setActiveTab('reminders')}
              className={`edge-menu-btn ${activeTab === 'reminders' ? 'active' : ''}`}
            >
              <Clock size={20} />
            </button>
            <span className="edge-menu-label">Reminders</span>
          </div>
        )}
        {visibleTabs.chat && (
          <div className="edge-menu-item-wrapper">
            <button
              onClick={() => setActiveTab('chat')}
              className={`edge-menu-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <MessageSquare size={20} />
            </button>
            <span className="edge-menu-label">Chat</span>
          </div>
        )}
      </div>

      {/* Main content area */}
      <main className="main-content">
        {/* Top Right Quick Widgets */}
        <div className="top-right-widgets">
          {/* Theme Toggle Button */}
          <button className="widget-circle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Profile Avatar with dropdown trigger */}
          {currentUser && (
            <button className="widget-circle-btn widget-profile-btn" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
              <div className={`widget-avatar ${currentUser.avatar}`}>
                {currentUser.name.charAt(0).toUpperCase()}
                <span className={`widget-status-dot ${currentUser.status.toLowerCase().replace(' ', '')}`} />
              </div>
            </button>
          )}
        </div>

        {/* Profile Settings Dropdown popover - Google Apps Launcher style */}
        {showProfileDropdown && currentUser && (
          <div className="profile-dropdown" ref={profileDropdownRef}>
            <div className="profile-dropdown-header">
              <span className="profile-dropdown-title">Google Apps</span>
              <button className="profile-dropdown-edit-btn" title="Google Settings" onClick={() => {
                window.open('https://myaccount.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <Edit2 size={14} />
              </button>
            </div>

            <div className="profile-launcher-grid">
              {/* Account */}
              <div className="launcher-item" onClick={() => {
                window.open('https://myaccount.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className={`launcher-icon-circle ${currentUser.avatar}`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="launcher-label">Account</span>
              </div>

              {/* Gmail */}
              <div className="launcher-item" onClick={() => {
                window.open('https://mail.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Gmail</span>
              </div>

              {/* Search */}
              <div className="launcher-item" onClick={() => {
                window.open('https://www.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Search" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Search</span>
              </div>

              {/* Maps */}
              <div className="launcher-item" onClick={() => {
                window.open('https://maps.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Google_Maps_icon_%282020%29.svg" alt="Maps" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Maps</span>
              </div>

              {/* Contacts */}
              <div className="launcher-item" onClick={() => {
                window.open('https://contacts.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon_%282020%29.svg" alt="Contacts" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Contacts</span>
              </div>

              {/* Calendar */}
              <div className="launcher-item" onClick={() => {
                window.open('https://calendar.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Calendar" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Calendar</span>
              </div>

              {/* Drive */}
              <div className="launcher-item" onClick={() => {
                window.open('https://drive.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Drive</span>
              </div>

              {/* Translate */}
              <div className="launcher-item" onClick={() => {
                window.open('https://translate.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Google_Translate_logo.svg" alt="Translate" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Translate</span>
              </div>

              {/* Photos */}
              <div className="launcher-item" onClick={() => {
                window.open('https://photos.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Photos_icon_%282020%29.svg" alt="Photos" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Photos</span>
              </div>

              {/* Gemini */}
              <div className="launcher-item" onClick={() => {
                window.open('https://gemini.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Gemini" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Gemini</span>
              </div>

              {/* News */}
              <div className="launcher-item" onClick={() => {
                window.open('https://news.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_News_icon_%282020%29.svg" alt="News" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">News</span>
              </div>

              {/* Meet */}
              <div className="launcher-item" onClick={() => {
                window.open('https://meet.google.com', '_blank', 'noopener,noreferrer');
                setShowProfileDropdown(false);
              }}>
                <div className="launcher-icon-circle bg-dark-glass">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg" alt="Meet" className="launcher-icon-img" />
                </div>
                <span className="launcher-label">Meet</span>
              </div>
            </div>

            {/* Ssleek drawer for SyncTab Account Status & Sign Out */}
            <div className="profile-dropdown-footer" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '12px',
              marginTop: '4px'
            }}>
              {/* Status Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['Active', 'Away', 'Meeting', 'Busy'].map((st) => {
                    const dotClass = st.toLowerCase();
                    const isSelected = currentUser.status.toLowerCase().includes(st.toLowerCase());
                    return (
                      <button
                        key={st}
                        onClick={() => {
                          handleStatusChange(st);
                          setShowProfileDropdown(false);
                        }}
                        title={st}
                        style={{
                          background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          border: isSelected ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <span className={`status-dot ${dotClass}`} style={{ position: 'relative', border: 'none', bottom: 'auto', right: 'auto', transform: 'scale(1.2)' }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sign Out & User Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email || 'Offline Session'}</span>
                </div>
                <button
                  onClick={() => { handleLogout(); setShowProfileDropdown(false); }}
                  style={{
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    color: 'var(--color-meeting)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading Workspace...</span>
          </div>
        ) : (
          <>
            {/* Navigated Tabs */}
            
            {/* A. DASHBOARD VIEW (Home view with Circle and Search) */}
            {activeTab === 'dashboard' && (
              <div className="home-page-container">
                {/* Glowing Circle Widget */}
                <div className="circle-widget">
                  <div className="circle-time" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                    <span>{timeStr.slice(0, 5)}</span>
                    {!clockFormat24h && timeStr.split(' ')[1] && (
                      <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, color: 'var(--primary)', letterSpacing: '0.5px' }}>
                        {timeStr.split(' ')[1]}
                      </span>
                    )}
                  </div>
                  <div className="circle-greeting">
                    {customGreeting || (() => {
                      const hour = new Date().getHours();
                      const name = currentUser?.name.split(' ')[0] || 'User';
                      if (hour < 12) return `Good morning, ${name}`;
                      if (hour < 18) return `Good afternoon, ${name}`;
                      return `Good evening, ${name}`;
                    })()}
                  </div>
                  <div className="circle-date" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', opacity: 0.8 }}>
                    {dateStr}
                  </div>
                </div>

                {/* Sleek Search Bar */}
                <form onSubmit={handleSearchSubmit} className="search-bar-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search Google..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="search-btn">
                    <Search size={18} />
                  </button>
                </form>
              </div>
            )}

            {/* B. DETAILED BOOKMARKS VIEW */}
            {activeTab === 'bookmarks' && (
              <div className="widget-container glass-panel">
                <div className="widget-header-row">
                  <div>
                    <h3 className="widget-title"><BookmarkIcon size={20} color="var(--primary)" /> Manage Bookmarks</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Add personal bookmarks or share useful URLs with your workspace team.
                    </p>
                  </div>
                  <button className="btn-primary" onClick={() => setIsBookmarkModalOpen(true)}>
                    <Plus size={16} /> Add Bookmark
                  </button>
                </div>

                <div className="bookmark-tabs">
                  {bookmarkCategories.map((cat) => (
                    <button
                      key={cat}
                      className={`bookmark-tab ${selectedBookmarkCat === cat ? 'active' : ''}`}
                      onClick={() => setSelectedBookmarkCat(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="bookmarks-grid">
                  {filteredBookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="bookmark-card"
                      onClick={() => handleBookmarkClick(b)}
                      style={{ minHeight: '140px' }}
                    >
                      {b.isShared && <span className="bookmark-shared-tag">Shared</span>}
                      <button
                        className="bookmark-delete-btn"
                        onClick={(e) => handleDeleteBookmark(b.id, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="bookmark-icon-box">
                        <Globe size={18} />
                      </div>
                      <div className="bookmark-title">{b.title}</div>
                      <div className="bookmark-clicks" style={{ fontSize: '11px' }}>{b.category} • {b.clicks} clicks</div>
                    </div>
                  ))}
                  {filteredBookmarks.length === 0 && (
                    <div className="empty-state widget-span-12">
                      <span className="empty-state-icon">📂</span>
                      <span>No bookmarks found in this category.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* C. DETAILED NOTES VIEW */}
            {activeTab === 'notes' && (
              <div className="widget-container glass-panel">
                <div className="widget-header-row">
                  <div>
                    <h3 className="widget-title"><FileText size={20} color="var(--primary)" /> Workspace Notes</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Private notes are visible only to you. Shared notes sync in real-time with teammates.
                    </p>
                  </div>
                  <button className="btn-primary" onClick={handleCreateNote}>
                    <Plus size={16} /> New Note
                  </button>
                </div>

                <div className="notes-layout">
                  {/* Left Side Note list */}
                  <div className="notes-list">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                        onClick={() => setSelectedNote(note)}
                      >
                        <div className="note-item-title">{note.title}</div>
                        <div className="note-item-meta">
                          <span>By {note.user?.name || 'Teammate'}</span>
                          {note.isShared && <span className="note-shared-badge">Shared</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Side Note Editor */}
                  {selectedNote ? (
                    <div className="notes-editor">
                      <input
                        type="text"
                        className="note-title-input"
                        value={selectedNote.title}
                        onChange={(e) => {
                          setSelectedNote({ ...selectedNote, title: e.target.value });
                          setNoteSavingStatus('dirty');
                        }}
                      />
                      <textarea
                        className="note-textarea"
                        placeholder="Write note contents... Supports standard text formatting."
                        value={selectedNote.content}
                        onChange={(e) => {
                          setSelectedNote({ ...selectedNote, content: e.target.value });
                          setNoteSavingStatus('dirty');
                        }}
                      />
                      <div className="note-editor-footer">
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <label className="form-checkbox-row">
                            <input
                              type="checkbox"
                              checked={selectedNote.isShared}
                              onChange={(e) => {
                                setSelectedNote({ ...selectedNote, isShared: e.target.checked });
                                setNoteSavingStatus('dirty');
                              }}
                            />
                            Share with team
                          </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {noteSavingStatus === 'saving' && 'Saving updates...'}
                            {noteSavingStatus === 'saved' && 'Draft Saved'}
                            {noteSavingStatus === 'dirty' && 'Unsaved changes'}
                          </span>
                          <button className="btn-primary" onClick={handleUpdateNote}>
                            <Save size={14} /> Save Note
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-meeting)', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                            onClick={() => handleDeleteNote(selectedNote.id)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <span className="empty-state-icon">📝</span>
                      <span>Select or create a note on the left panel to begin editing.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* D. DETAILED TASK KANBAN VIEW */}
            {activeTab === 'tasks' && (
              <div className="widget-container glass-panel">
                <div className="widget-header-row">
                  <div>
                    <h3 className="widget-title"><CheckSquare size={20} color="var(--primary)" /> Team Project Kanban</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Assign issues to teammates, prioritize workload, and move tasks across boards.
                    </p>
                  </div>
                  <button className="btn-primary" onClick={() => setIsTaskModalOpen(true)}>
                    <Plus size={16} /> Create Task
                  </button>
                </div>

                <div className="kanban-board">
                  {/* Column 1: TODO */}
                  <div className="kanban-column">
                    <div className="column-header">
                      <span className="column-title"><span className="status-dot" style={{ backgroundColor: 'var(--color-todo)', position: 'relative' }} /> TODO</span>
                      <span className="column-count">{tasks.filter((t) => t.status === 'TODO').length}</span>
                    </div>
                    <div className="tasks-list">
                      {tasks.filter((t) => t.status === 'TODO').map((task) => (
                        <div key={task.id} className="task-card">
                          <button
                            style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                          <div className="task-card-title">{task.title}</div>
                          {task.description && <div className="task-card-desc">{task.description}</div>}
                          <div className="task-card-footer">
                            <span className={`task-priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                            <div className="task-assignee-box">
                              {task.assignee ? (
                                <div className={`task-assignee-avatar ${task.assignee.avatar}`} title={`Assigned to ${task.assignee.name}`}>
                                  {task.assignee.name.charAt(0)}
                                </div>
                              ) : (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Unassigned</span>
                              )}
                              <button
                                className="btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '9px' }}
                                onClick={() => handleTaskStatusMove(task, 'IN_PROGRESS')}
                              >
                                Start
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: IN_PROGRESS */}
                  <div className="kanban-column">
                    <div className="column-header">
                      <span className="column-title"><span className="status-dot" style={{ backgroundColor: 'var(--color-inprogress)', position: 'relative' }} /> IN PROGRESS</span>
                      <span className="column-count">{tasks.filter((t) => t.status === 'IN_PROGRESS').length}</span>
                    </div>
                    <div className="tasks-list">
                      {tasks.filter((t) => t.status === 'IN_PROGRESS').map((task) => (
                        <div key={task.id} className="task-card">
                          <button
                            style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                          <div className="task-card-title">{task.title}</div>
                          {task.description && <div className="task-card-desc">{task.description}</div>}
                          <div className="task-card-footer">
                            <span className={`task-priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                            <div className="task-assignee-box">
                              {task.assignee && (
                                <div className={`task-assignee-avatar ${task.assignee.avatar}`} title={`Assigned to ${task.assignee.name}`}>
                                  {task.assignee.name.charAt(0)}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '9px' }}
                                  onClick={() => handleTaskStatusMove(task, 'TODO')}
                                >
                                  Reset
                                </button>
                                <button
                                  className="btn-primary"
                                  style={{ padding: '2px 6px', fontSize: '9px' }}
                                  onClick={() => handleTaskStatusMove(task, 'DONE')}
                                >
                                  Finish
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: DONE */}
                  <div className="kanban-column">
                    <div className="column-header">
                      <span className="column-title"><span className="status-dot" style={{ backgroundColor: 'var(--color-done)', position: 'relative' }} /> DONE</span>
                      <span className="column-count">{tasks.filter((t) => t.status === 'DONE').length}</span>
                    </div>
                    <div className="tasks-list">
                      {tasks.filter((t) => t.status === 'DONE').map((task) => (
                        <div key={task.id} className="task-card" style={{ opacity: 0.75 }}>
                          <button
                            style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                          <div className="task-card-title" style={{ textDecoration: 'line-through' }}>{task.title}</div>
                          {task.description && <div className="task-card-desc">{task.description}</div>}
                          <div className="task-card-footer">
                            <span className={`task-priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                            <div className="task-assignee-box">
                              {task.assignee && (
                                <div className={`task-assignee-avatar ${task.assignee.avatar}`} title={`Assigned to ${task.assignee.name}`}>
                                  {task.assignee.name.charAt(0)}
                                </div>
                              )}
                              <button
                                className="btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '9px' }}
                                onClick={() => handleTaskStatusMove(task, 'IN_PROGRESS')}
                              >
                                Reopen
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* E. DETAILED REMINDERS VIEW */}
            {activeTab === 'reminders' && (
              <div className="widget-container glass-panel">
                <div>
                  <h3 className="widget-title"><Clock size={20} color="var(--primary)" /> Task Reminders</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Setup alert triggers for deadlines, team presentations or meetings.
                  </p>
                </div>

                <form onSubmit={handleCreateReminder} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Reminder Text</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Standup presentation preparation"
                      value={newReminderText}
                      onChange={(e) => setNewReminderText(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trigger Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    <Plus size={14} /> Add Reminder
                  </button>
                </form>

                <div className="reminders-list" style={{ marginTop: '20px' }}>
                  {reminders.map((rem) => (
                    <div key={rem.id} className="reminder-item">
                      <div className="reminder-content">
                        <button
                          className={`reminder-checkbox ${rem.isCompleted ? 'checked' : ''}`}
                          onClick={() => handleToggleReminder(rem.id)}
                        >
                          {rem.isCompleted && <Check size={12} />}
                        </button>
                        <div>
                          <div className={`reminder-text ${rem.isCompleted ? 'completed' : ''}`}>
                            {rem.text}
                          </div>
                          <div className="reminder-date">
                            Scheduled: {new Date(rem.dueDate).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <button className="reminder-delete-btn" onClick={() => handleDeleteReminder(rem.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <div className="empty-state">
                      <span className="empty-state-icon">🔔</span>
                      <span>No reminders scheduled for this profile.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* F. DETAILED CHAT VIEW */}
            {activeTab === 'chat' && (
              <div className="chat-page-container">
                <div className="chat-channel-sidebar">
                  <h3 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px', margin: '4px 0 10px 0' }}>Workspace Channels</h3>
                  <div className="chat-channel-list">
                    <button className="chat-channel-item active">
                      # general-workspace
                    </button>
                    <button className="chat-channel-item" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                      # announcements
                    </button>
                    <button className="chat-channel-item" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                      # links-sharing
                    </button>
                  </div>
                </div>

                <div className="chat-main-area">
                  <div className="chat-main-header">
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 800 }}># general-workspace</span>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Welcome to the team coordination channel</p>
                    </div>
                  </div>

                  <div className="chat-messages-container">
                    {messages.map((msg) => (
                      <div key={msg.id} className="chat-msg-row">
                        <div className={`chat-msg-avatar ${msg.user?.avatar || 'avatar-1'}`}>
                          {msg.user?.name ? msg.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="chat-msg-content-box">
                          <div className="chat-msg-meta">
                            <span className="chat-msg-sender">{msg.user?.name || 'Teammate'}</span>
                            <span className="chat-msg-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="chat-msg-text">{msg.text}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendChatMessage} className="chat-page-input-wrapper">
                    <input
                      type="text"
                      className="chat-page-input"
                      placeholder="Send a message to #general-workspace..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <button type="submit" className="chat-page-send-btn">
                      Send <ChevronRight size={16} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* G. DETAILED CUSTOMIZE VIEW */}
            {activeTab === 'customize' && (
              <div className="widget-container glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="widget-header-row">
                  <div>
                    <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={20} color="var(--primary)" /> Customize Dashboard
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Elevate your space with premium custom aesthetics, themes, backgrounds, and layout widgets.
                    </p>
                  </div>
                </div>

                <div className="customize-main-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', marginTop: '16px' }}>
                  
                  {/* Left Column: Aesthetics, Layout & Clock Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Theme & Brand Styling Card */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Palette size={14} color="var(--primary)" /> Theme & Aesthetics
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Choose theme mode, brand accent highlight, and backdrop glass blur intensity.
                      </p>

                      {/* Theme Mode Option */}
                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Interface Theme</span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            onClick={() => setIsDarkMode(false)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: !isDarkMode ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                              background: !isDarkMode ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)',
                              color: !isDarkMode ? 'var(--text-primary)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Sun size={12} /> Light Theme
                          </button>
                          <button
                            onClick={() => setIsDarkMode(true)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isDarkMode ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                              background: isDarkMode ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)',
                              color: isDarkMode ? 'var(--text-primary)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Moon size={12} /> Dark Theme
                          </button>
                        </div>
                      </div>

                      {/* Accent Color Highlight */}
                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Brand Accent Color</span>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                          {[
                            { name: 'Violet', value: '#8b5cf6' },
                            { name: 'Emerald', value: '#10b981' },
                            { name: 'Blue', value: '#3b82f6' },
                            { name: 'Orange', value: '#f97316' },
                            { name: 'Rose', value: '#ec4899' }
                          ].map((color) => {
                            const isSelected = accentColor === color.value;
                            return (
                              <button
                                key={color.value}
                                onClick={() => handleUpdateAccentColor(color.value)}
                                title={color.name}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: color.value,
                                  border: isSelected ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                                  boxShadow: isSelected ? `0 0 12px ${color.value}` : 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Glass Blur Intensity */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Glass Blur Intensity</span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {[
                            { label: 'Low', value: '8px' },
                            { label: 'Medium', value: '20px' },
                            { label: 'High', value: '40px' }
                          ].map((blur) => {
                            const isSelected = blurIntensity === blur.value;
                            return (
                              <button
                                key={blur.value}
                                onClick={() => handleUpdateBlurIntensity(blur.value)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                                  background: isSelected ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)',
                                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {blur.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Clock & Greeting Settings Card */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--primary)" /> Clock & Greeting Customizer
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Customize hour format and glowing clock center display greeting text.
                      </p>

                      {/* Clock Format */}
                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Time Format</span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {[
                            { label: '12-Hour (AM/PM)', value: false },
                            { label: '24-Hour (Military)', value: true }
                          ].map((fmt) => {
                            const isSelected = clockFormat24h === fmt.value;
                            return (
                              <button
                                key={String(fmt.value)}
                                onClick={() => handleUpdateClockFormat(fmt.value)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                                  background: isSelected ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)',
                                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {fmt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Greeting Text */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Greeting Text Override</span>
                        <div className="form-group" style={{ marginBottom: 0, marginTop: '6px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Welcome Home, Md"
                            value={customGreeting}
                            onChange={(e) => setCustomGreeting(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Configure Menu Items Card */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layout size={14} color="var(--primary)" /> Configure Edge Menus
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        Toggle visibility of vertical navigation items placed at screen boundaries.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <label className="form-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                          <input
                            type="checkbox"
                            checked={visibleTabs.bookmarks}
                            onChange={(e) => setVisibleTabs({ ...visibleTabs, bookmarks: e.target.checked })}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookmarkIcon size={12} /> Bookmarks
                          </span>
                        </label>
                        <label className="form-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                          <input
                            type="checkbox"
                            checked={visibleTabs.notes}
                            onChange={(e) => setVisibleTabs({ ...visibleTabs, notes: e.target.checked })}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={12} /> Notes
                          </span>
                        </label>
                        <label className="form-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                          <input
                            type="checkbox"
                            checked={visibleTabs.tasks}
                            onChange={(e) => setVisibleTabs({ ...visibleTabs, tasks: e.target.checked })}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckSquare size={12} /> Tasks
                          </span>
                        </label>
                        <label className="form-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                          <input
                            type="checkbox"
                            checked={visibleTabs.reminders}
                            onChange={(e) => setVisibleTabs({ ...visibleTabs, reminders: e.target.checked })}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} /> Reminders
                          </span>
                        </label>
                        <label className="form-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                          <input
                            type="checkbox"
                            checked={visibleTabs.chat}
                            onChange={(e) => setVisibleTabs({ ...visibleTabs, chat: e.target.checked })}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={12} /> Live Chat
                          </span>
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Wallpaper Management & Cloudinary Image Uploads */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Background Wallpapers Grid */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ImageIcon size={14} color="var(--primary)" /> Select Background Wallpaper
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {wallpapers.map((wp) => {
                          const isSelected = currentWallpaper === wp.url;
                          const isCustom = !!wp.isCustom;
                          return (
                            <div key={wp.id} style={{ position: 'relative', height: '64px', borderRadius: '8px', overflow: 'hidden' }}>
                              <button
                                type="button"
                                onClick={() => setCurrentWallpaper(wp.url)}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                                  background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.35)), url('${wp.url}')`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s',
                                  boxShadow: isSelected ? '0 0 10px var(--primary-glow)' : 'none'
                                }}
                              >
                                {wp.name}
                              </button>
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomWallpaper(wp.id, wp.url)}
                                  title="Delete Custom Wallpaper"
                                  style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(239, 68, 68, 0.9)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    zIndex: 2,
                                    transition: 'opacity 0.2s'
                                  }}
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Premium Image Uploader via Cloudinary */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UploadCloud size={14} color="var(--primary)" /> Cloudinary Image Uploader
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Upload files directly to Cloudinary and sync with your workspace background library.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Wallpaper display name (optional)"
                            value={customWpName}
                            onChange={(e) => setCustomWpName(e.target.value)}
                          />
                        </div>

                        {uploadError && (
                          <div style={{ fontSize: '11px', color: '#ef4444', padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {uploadError}
                          </div>
                        )}

                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          border: '2px dashed var(--panel-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '20px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'border-color 0.2s',
                          background: 'rgba(255,255,255,0.005)'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            disabled={isUploading || !currentUser}
                          />
                          <UploadCloud size={28} color={isUploading ? 'var(--text-muted)' : 'var(--primary)'} style={{ transition: 'all 0.2s' }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                            {isUploading ? 'Uploading to Cloudinary...' : 'Click to Browse & Upload'}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Supports PNG, JPG, WEBP formats</span>
                        </div>
                      </div>
                    </div>

                    {/* Fallback Paste URL Form */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>Or Link Image URL</h4>
                      <form onSubmit={handleAddCustomWallpaper} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <input
                            type="url"
                            className="form-input"
                            placeholder="https://example.com/background.jpg"
                            value={customWpUrl}
                            onChange={(e) => setCustomWpUrl(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '11px', gap: '4px' }}>
                          <Plus size={12} /> Add via URL
                        </button>
                      </form>
                    </div>

                  </div>

                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ==================== MODALS ==================== */}

      {/* 1. Bookmark Modal */}
      {isBookmarkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Add Launch Bookmark</h3>
              <button className="modal-close" onClick={() => setIsBookmarkModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBookmark} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Office Outlook"
                  value={newBookmark.title}
                  onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://outlook.office.com"
                  value={newBookmark.url}
                  onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newBookmark.category}
                    onChange={(e) => setNewBookmark({ ...newBookmark, category: e.target.value })}
                  >
                    <option value="Work">Work</option>
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Tech News">Tech News</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-checkbox-row">
                  <input
                    type="checkbox"
                    checked={newBookmark.isShared}
                    onChange={(e) => setNewBookmark({ ...newBookmark, isShared: e.target.checked })}
                  />
                  Share with teammates dashboard
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsBookmarkModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Create Project Task</h3>
              <button className="modal-close" onClick={() => setIsTaskModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Write API endpoints documentation"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Provide task specifics or checklists..."
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select
                    className="form-select"
                    value={newTask.assigneeId}
                    onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
