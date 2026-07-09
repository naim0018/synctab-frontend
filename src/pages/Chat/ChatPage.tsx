import { useState, useEffect, useRef, useCallback } from 'react';
import './ChatPage.css';
import { useChat, type Conversation, type ChatMessage } from '../../hooks/useChat';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';
const getUser = () => { try { const s = localStorage.getItem('synctab_user'); return s ? JSON.parse(s) : null; } catch { return null; } };
const fmtTime = (d: string) => { const dt = new Date(d); return `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`; };
const fmtDay = (d: string) => { const dt = new Date(d); const now = new Date(); const diff = now.getDate() - dt.getDate(); if (diff === 0 && now.getMonth() === dt.getMonth()) return 'Today'; if (diff === 1) return 'Yesterday'; return `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()}`; };
const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','✅','👏','🎉','🤔','💯','😍'];

interface NewDMModalProps { onClose: () => void; onCreated: (c: Conversation) => void; userId: string; }
function NewDMModal({ onClose, onCreated, userId }: NewDMModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${API}/chat/conversations/dm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: userId, targetEmail: email.trim() }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.message || 'Failed'); setLoading(false); return; }
      onCreated(d.data || d);
    } catch { setErr('Network error'); setLoading(false); }
  };
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-title">💬 New Direct Message</div>
        <div><div className="chat-modal-label">User email</div><input className="chat-modal-input" placeholder="friend@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus /></div>
        {err && <div style={{ color: '#f87171', fontSize: '12px' }}>{err}</div>}
        <div className="chat-modal-actions">
          <button className="chat-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="chat-btn-primary" onClick={submit} disabled={loading || !email.trim()}>{loading ? '...' : 'Start Chat'}</button>
        </div>
      </div>
    </div>
  );
}

interface NewGroupModalProps { onClose: () => void; onCreated: (c: Conversation) => void; userId: string; }
function NewGroupModal({ onClose, onCreated, userId }: NewGroupModalProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👥');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const addEmail = () => { const e = emailInput.trim(); if (e && !emails.includes(e)) setEmails(p => [...p, e]); setEmailInput(''); };
  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${API}/chat/conversations/group`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: userId, name: name.trim(), avatar, memberEmails: emails }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.message || 'Failed'); setLoading(false); return; }
      onCreated(d.data || d);
    } catch { setErr('Network error'); setLoading(false); }
  };
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-title">👥 New Group</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 0 }}><div className="chat-modal-label">Icon</div><input className="chat-modal-input" style={{ width: '60px', textAlign: 'center', fontSize: '20px' }} value={avatar} onChange={e => setAvatar(e.target.value)} /></div>
          <div style={{ flex: 1 }}><div className="chat-modal-label">Group name</div><input className="chat-modal-input" placeholder="Team Alpha" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        </div>
        <div>
          <div className="chat-modal-label">Invite members (email)</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input className="chat-modal-input" style={{ flex: 1 }} placeholder="member@example.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEmail()} />
            <button className="chat-btn-ghost" onClick={addEmail}>Add</button>
          </div>
          {emails.length > 0 && <div className="chat-tag-list" style={{ marginTop: '8px' }}>{emails.map(e => <span key={e} className="chat-tag">{e}<button onClick={() => setEmails(p => p.filter(x => x !== e))}>✕</button></span>)}</div>}
        </div>
        {err && <div style={{ color: '#f87171', fontSize: '12px' }}>{err}</div>}
        <div className="chat-modal-actions">
          <button className="chat-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="chat-btn-primary" onClick={submit} disabled={loading || !name.trim()}>{loading ? '...' : 'Create Group'}</button>
        </div>
      </div>
    </div>
  );
}

interface AddMemberModalProps { convId: string; onClose: () => void; userId: string; }
function AddMemberModal({ convId, onClose, userId }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true); setMsg('');
    const r = await fetch(`${API}/chat/conversations/${convId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: userId, email: email.trim() }) });
    const d = await r.json();
    if (r.ok) { setMsg('Member added!'); setEmail(''); } else { setMsg(d.message || 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-title">➕ Add Member</div>
        <div><div className="chat-modal-label">Email</div><input className="chat-modal-input" placeholder="new@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus /></div>
        {msg && <div style={{ fontSize: '12px', color: msg.includes('!') ? '#34d399' : '#f87171' }}>{msg}</div>}
        <div className="chat-modal-actions"><button className="chat-btn-ghost" onClick={onClose}>Close</button><button className="chat-btn-primary" onClick={submit} disabled={loading || !email.trim()}>{loading ? '...' : 'Add'}</button></div>
      </div>
    </div>
  );
}

interface EditGroupModalProps { conv: Conversation; onClose: () => void; userId: string; onUpdated: (c: Conversation) => void; }
function EditGroupModal({ conv, onClose, userId, onUpdated }: EditGroupModalProps) {
  const [name, setName] = useState(conv.name || '');
  const [avatar, setAvatar] = useState(conv.avatar || '👥');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  
  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${API}/chat/conversations/${conv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name: name.trim(), avatar }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.message || 'Failed'); setLoading(false); return; }
      onUpdated(d.data || d);
    } catch { setErr('Network error'); setLoading(false); }
  };
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-title">✏️ Edit Group</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 0 }}><div className="chat-modal-label">Icon</div><input className="chat-modal-input" style={{ width: '60px', textAlign: 'center', fontSize: '20px' }} value={avatar} onChange={e => setAvatar(e.target.value)} /></div>
          <div style={{ flex: 1 }}><div className="chat-modal-label">Group name</div><input className="chat-modal-input" placeholder="Team Alpha" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        </div>
        {err && <div style={{ color: '#f87171', fontSize: '12px' }}>{err}</div>}
        <div className="chat-modal-actions">
          <button className="chat-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="chat-btn-primary" onClick={submit} disabled={loading || !name.trim()}>{loading ? '...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

interface MembersModalProps { conv: Conversation; onClose: () => void; userId: string; onRemoved: () => void; }
function MembersModal({ conv, onClose, userId, onRemoved }: MembersModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const removeMember = async (targetId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setLoadingId(targetId);
    try {
      await fetch(`${API}/chat/conversations/${conv.id}/members/${targetId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: userId }) });
      onRemoved();
    } catch (err) {
      console.error(err);
    }
    setLoadingId(null);
  };
  
  const myRole = conv.members.find(m => m.userId === userId)?.role;
  const canRemove = myRole === 'admin' || myRole === 'owner';

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-title">👥 Group Members ({conv.members.length})</div>
        <div className="chat-member-list">
          {conv.members.map(m => (
            <div key={m.userId} className="chat-member-item">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#fff', fontSize: '13px' }}>User {m.userId.slice(0,6)} {m.userId === userId ? '(You)' : ''}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'capitalize' }}>{m.role}</span>
              </div>
              {m.userId !== userId && canRemove && (
                <button className="chat-member-remove" onClick={() => removeMember(m.userId)} disabled={loadingId === m.userId}>
                  {loadingId === m.userId ? '...' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="chat-modal-actions"><button className="chat-btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const user = getUser();
  const userId: string = user?.id ?? '';
  const { connected, onlineUsers, typingUsers, joinConversation, sendTypingStart, sendTypingStop, sendMarkRead, on } = useChat(userId || null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reactingMsgId, setReactingMsgId] = useState<string | null>(null);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Preview / Gallery Modal State
  const [previewGroup, setPreviewGroup] = useState<{ isImage: boolean; name: string; url: string }[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConv = conversations.find(c => c.id === activeId) ?? null;

  // ── Load conversations ──
  const loadConvs = useCallback(async () => {
    if (!userId) return;
    const r = await fetch(`${API}/chat/conversations?userId=${userId}`);
    if (r.ok) { const d = await r.json(); setConversations(Array.isArray(d.data) ? d.data : d); }
    const u = await fetch(`${API}/chat/unread?userId=${userId}`);
    if (u.ok) { const d = await u.json(); setUnread(d.data || d); }
  }, [userId]);

  // ── Load messages ──
  const loadMessages = useCallback(async (convId: string) => {
    if (!userId) return;
    const r = await fetch(`${API}/chat/conversations/${convId}/messages?userId=${userId}`);
    if (r.ok) { const d = await r.json(); setMessages(Array.isArray(d.data) ? d.data : d); }
  }, [userId]);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    joinConversation(activeId);
  }, [activeId, loadMessages, joinConversation]);

  // ── Scroll to bottom ──
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60); }, [messages]);

  // ── Mark read on open ──
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId !== userId) {
      sendMarkRead(activeId, last.id);
      setUnread(p => ({ ...p, [activeId]: 0 }));
    }
  }, [activeId, messages, userId, sendMarkRead]);

  // ── Socket events ──
  useEffect(() => {
    const u1 = on('new_message', (data) => {
      const msg = data as ChatMessage;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c => c.id === msg.conversationId ? { ...c, lastMessage: msg } : c));
      if (msg.senderId !== userId && msg.conversationId !== activeId) {
        setUnread(p => ({ ...p, [msg.conversationId]: (p[msg.conversationId] ?? 0) + 1 }));
      }
      if (msg.conversationId === activeId && msg.senderId !== userId) {
        sendMarkRead(msg.conversationId, msg.id);
      }
    });
    const u2 = on('message_edited', (data) => { const m = data as ChatMessage; setMessages(prev => prev.map(p => p.id === m.id ? m : p)); });
    const u3 = on('message_deleted', (data) => { const { messageId } = data as { messageId: string }; setMessages(prev => prev.map(p => p.id === messageId ? { ...p, isDeleted: true, text: 'This message was deleted', attachments: '[]' } : p)); });
    const u4 = on('reaction_updated', (data) => {
      const { action, messageId, userId: uid, emoji } = data as { action: string; messageId: string; userId: string; emoji: string };
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        if (action === 'added') return { ...m, reactions: [...m.reactions, { id: Date.now().toString(), userId: uid, emoji }] };
        return { ...m, reactions: m.reactions.filter(r => !(r.userId === uid && r.emoji === emoji)) };
      }));
    });
    const u5 = on('conversation_updated', (data) => {
      const conv = data as Conversation & { isDeleted?: boolean };
      if (conv.isDeleted) {
        setConversations(prev => prev.filter(c => c.id !== conv.id));
        if (activeId === conv.id) setActiveId(null);
      } else {
        loadConvs();
      }
    });
    const u6 = on('member_added', () => loadConvs());
    const u7 = on('member_removed', (data) => {
      const targetId = data as string;
      if (targetId === userId) {
        // We were removed/left, hide the conversation
        setConversations(prev => prev.filter(c => c.id !== activeId)); // It would be better to check conversation ID if provided, but let's reload
        loadConvs();
        setActiveId(null);
      } else {
        loadConvs();
      }
    });
    const u8 = on('message_read', (data) => {
      const { conversationId, userId: uid, lastMessageId } = data as { conversationId: string; userId: string; lastMessageId: string };
      
      // Update member's lastReadAt in active conversations to sync checking seen/unseen
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          members: c.members.map(m => m.userId === uid ? { ...m, lastReadAt: new Date().toISOString() } : m)
        };
      }));

      // Also append read receipt to the messages state if matched
      setMessages(prev => prev.map(m => {
        if (m.id === lastMessageId && !m.reads.some(r => r.userId === uid)) {
          return {
            ...m,
            reads: [...m.reads, { userId: uid, readAt: new Date().toISOString() }]
          };
        }
        return m;
      }));
    });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); };
  }, [on, userId, activeId, loadConvs, sendMarkRead]);

  // ── Handle file upload ──
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Compress image using canvas before upload if it's a large image
        let uploadFile: File | Blob = file;
        if (file.type.startsWith('image/')) {
          uploadFile = await new Promise<File | Blob>((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
              URL.revokeObjectURL(url);
              const canvas = document.createElement('canvas');
              let { width, height } = img;
              const maxDim = 1200;
              if (width > maxDim || height > maxDim) {
                if (width > height) { height *= maxDim / width; width = maxDim; }
                else { width *= maxDim / height; height = maxDim; }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                  resolve(blob ? new File([blob], file.name, { type: 'image/webp' }) : file);
                }, 'image/webp', 0.8);
              } else {
                resolve(file);
              }
            };
            img.onerror = () => resolve(file);
            img.src = url;
          });
        }
        
        const formData = new FormData();
        formData.append('file', uploadFile);
        const r = await fetch(`${API}/upload`, { method: 'POST', body: formData });
        if (r.ok) {
          const res = await r.json();
          const outUrl = res.data?.url || res.url;
          if (outUrl) {
            const type = file.type.startsWith('image/') ? 'image' : 'file';
            return { name: file.name, url: outUrl, type };
          }
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      const newFiles = results.filter(f => f !== null) as { name: string; url: string; type: string }[];
      setSelectedFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      console.error('Chat upload failed:', err);
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Handle Leave or Delete Conversation ──
  const handleLeaveOrDelete = async () => {
    if (!activeConv || !userId) return;
    const myRole = activeConv.members.find(m => m.userId === userId)?.role;
    
    if (activeConv.isGroup) {
      if (myRole === 'owner' || myRole === 'admin') {
        if (!confirm('Are you sure you want to DELETE this group? This cannot be undone.')) return;
        await fetch(`${API}/chat/conversations/${activeConv.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: userId }) });
      } else {
        if (!confirm('Are you sure you want to leave this group?')) return;
        await fetch(`${API}/chat/conversations/${activeConv.id}/members/${userId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: userId }) });
      }
    } else {
      if (!confirm('Are you sure you want to delete this chat?')) return;
      await fetch(`${API}/chat/conversations/${activeConv.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: userId }) });
    }
  };

  // ── Send message (Optimistic UX) ──
  const sendMsg = () => {
    if ((!text.trim() && selectedFiles.length === 0) || !activeId || !userId) return;
    const body = { 
      senderId: userId, 
      text: text.trim(), 
      replyToId: replyTo?.id,
      attachments: JSON.stringify(selectedFiles)
    };
    
    // Instantly clear UI so it feels extremely fast
    setText(''); 
    setReplyTo(null);
    setSelectedFiles([]);
    sendTypingStop(activeId);
    
    // Fire and forget
    fetch(`${API}/chat/conversations/${activeId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  };

  // ── Typing ──
  const handleTextChange = (val: string) => {
    setText(val);
    if (!activeId) return;
    sendTypingStart(activeId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTypingStop(activeId), 2000);
  };

  // ── Reactions (Optimistic UI) ──
  const toggleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existingIdx = m.reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
      const newReactions = [...m.reactions];
      if (existingIdx >= 0) newReactions.splice(existingIdx, 1);
      else newReactions.push({ id: Date.now().toString(), userId, emoji });
      return { ...m, reactions: newReactions };
    }));
    // Fire and forget
    fetch(`${API}/chat/messages/${msgId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, emoji }) });
  };

  // ── Delete ──
  const deleteMsg = async (msgId: string) => {
    await fetch(`${API}/chat/messages/${msgId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
  };

  // ── Edit ──
  const saveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    await fetch(`${API}/chat/messages/${msgId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, text: editText }) });
    setEditingMsgId(null);
  };

  // ── Helper: check if message has been seen by others ──
  const isMessageSeen = (msg: ChatMessage) => {
    if (!activeConv) return false;
    const otherMembers = activeConv.members.filter(m => m.userId !== userId);
    if (otherMembers.length === 0) return false;
    const msgTime = new Date(msg.createdAt).getTime();
    return otherMembers.some(m => {
      if (!m.lastReadAt) return false;
      return new Date(m.lastReadAt).getTime() >= msgTime;
    });
  };

  // ── Helper: conv display name ──
  const getConvName = (c: Conversation) => {
    if (c.isGroup) return c.name ?? 'Group';
    const otherId = c.members.find(m => m.userId !== userId)?.userId;
    return otherId ? `User ${otherId.slice(0, 6)}` : 'DM';
  };
  const getConvAvatar = (c: Conversation) => c.isGroup ? (c.avatar ?? '👥') : null;

  // ── Typing display ──
  const whoTyping = activeId ? [...(typingUsers.get(activeId) ?? [])].filter(id => id !== userId) : [];

  // ── Date grouping ──
  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const d = fmtDay(msg.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.date === d) { last.msgs.push(msg); } else { acc.push({ date: d, msgs: [msg] }); }
    return acc;
  }, []);

  const filteredConvs = conversations.filter(c => getConvName(c).toLowerCase().includes(search.toLowerCase()));

  if (!user) return <div className="chat-no-conv" style={{ height: '100%' }}>Please log in to use chat.</div>;

  return (
    <div className="chat-root">
      {/* ── Sidebar ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span className="chat-sidebar-title">💬 Messages</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="chat-new-btn" onClick={() => setShowNewDM(true)} title="New DM">+ DM</button>
            <button className="chat-new-btn" onClick={() => setShowNewGroup(true)} title="New Group">+ Group</button>
          </div>
        </div>
        <div className="chat-search"><input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="chat-conv-list">
          {filteredConvs.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>No conversations yet.<br />Start a new DM or Group!</div>}
          {filteredConvs.map(c => {
            const isOnline = c.members.some(m => m.userId !== userId && onlineUsers.has(m.userId));
            const avatar = getConvAvatar(c);
            const name = getConvName(c);
            const badge = unread[c.id] ?? 0;
            return (
              <div key={c.id} className={`chat-conv-item${activeId === c.id ? ' active' : ''}`} onClick={() => setActiveId(c.id)}>
                <div className="chat-conv-avatar">
                  {avatar ? avatar : name.slice(0, 2).toUpperCase()}
                  {!c.isGroup && isOnline && <div className="chat-online-dot" />}
                </div>
                <div className="chat-conv-info">
                  <div className="chat-conv-name">{name}</div>
                  <div className="chat-conv-preview">{c.lastMessage?.isDeleted ? '🗑 Deleted' : c.lastMessage?.text ?? 'No messages yet'}</div>
                </div>
                <div className="chat-conv-meta">
                  {c.lastMessage && <span className="chat-conv-time">{fmtTime(c.lastMessage.createdAt)}</span>}
                  {badge > 0 && <span className="chat-unread-badge">{badge > 99 ? '99+' : badge}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: connected ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#34d399' : '#f87171', display: 'inline-block' }} />
          {connected ? 'Connected' : 'Reconnecting...'}
        </div>
      </div>

      {/* ── Main ── */}
      {!activeConv ? (
        <div className="chat-empty">
          <div className="chat-empty-icon">💬</div>
          <div className="chat-empty-title">Select a conversation</div>
          <div className="chat-empty-sub">or start a new DM / group</div>
        </div>
      ) : (
        <div className="chat-main">
          {/* Header */}
          <div className="chat-main-header">
            <div className="chat-header-avatar">{getConvAvatar(activeConv) ?? getConvName(activeConv).slice(0, 2).toUpperCase()}</div>
            <div className="chat-header-info">
              <div className="chat-header-name">{getConvName(activeConv)}</div>
              <div className="chat-header-status" style={{ cursor: activeConv.isGroup ? 'pointer' : 'default', textDecoration: activeConv.isGroup ? 'underline' : 'none' }} onClick={() => { if(activeConv.isGroup) setShowMembers(true); }}>
                {activeConv.isGroup ? `${activeConv.members.length} members` : (activeConv.members.some(m => m.userId !== userId && onlineUsers.has(m.userId)) ? '🟢 Online' : '⚫ Offline')}
              </div>
            </div>
            <div className="chat-header-actions">
              {activeConv.isGroup && <button className="chat-header-btn" onClick={() => setShowAddMember(true)} title="Add Member">➕</button>}
              {activeConv.isGroup && <button className="chat-header-btn" onClick={() => setShowEditGroup(true)} title="Edit Group">✏️</button>}
              <button className="chat-header-btn" onClick={handleLeaveOrDelete} style={{ color: '#f87171' }} title={activeConv.isGroup ? 'Leave/Delete Group' : 'Delete Chat'}>
                🗑
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {groupedMessages.map(group => (
              <div key={group.date}>
                <div className="chat-day-divider"><span>{group.date}</span></div>
                {group.msgs.map(msg => {
                  const isOwn = msg.senderId === userId;
                  const seen = isMessageSeen(msg);

                  // Parse message attachments
                  let parsedAttachments: { name: string; url: string; type: string }[] = [];
                  try {
                    if (msg.attachments) {
                      parsedAttachments = JSON.parse(msg.attachments);
                    }
                  } catch (e) {
                    console.error("Failed parsing message attachments", e);
                  }

                  return (
                    <div key={msg.id} className={`chat-message-row${isOwn ? ' own' : ''}`}>
                      {!isOwn && <div className="chat-msg-avatar">{msg.senderId.slice(0, 2).toUpperCase()}</div>}
                      <div className="chat-msg-body" style={{ position: 'relative' }}>
                        {!isOwn && <div className="chat-msg-sender">User {msg.senderId.slice(0, 6)}</div>}
                        {msg.replyToId && <div className="chat-reply-preview">↩ Replying to a message</div>}
                        
                        {editingMsgId === msg.id ? (
                          <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                            <textarea className="chat-input-box" style={{ minHeight: '60px' }} value={editText} onChange={e => setEditText(e.target.value)} />
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button className="chat-btn-ghost" onClick={() => setEditingMsgId(null)}>Cancel</button>
                              <button className="chat-btn-primary" onClick={() => saveEdit(msg.id)}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className={`chat-msg-bubble${msg.isDeleted ? ' deleted' : ''}`}>
                            {msg.text}
                            {msg.editedAt && !msg.isDeleted && <span className="chat-msg-edited">(edited)</span>}
                            
                            {/* Attachments rendering */}
                            {parsedAttachments.length > 0 && !msg.isDeleted && (
                              <div className="chat-msg-attachments">
                                {parsedAttachments.map((file, fileIdx) => {
                                  const isImg = file.type === 'image' || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                  if (isImg) {
                                    return (
                                      <img
                                        key={fileIdx}
                                        src={file.url}
                                        alt={file.name}
                                        className="chat-msg-attachment-img"
                                        onClick={() => {
                                          setPreviewGroup(parsedAttachments.map(f => ({
                                            isImage: f.type === 'image' || f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? true : false,
                                            name: f.name,
                                            url: f.url
                                          })));
                                          setPreviewIndex(fileIdx);
                                        }}
                                      />
                                    );
                                  }
                                  return (
                                    <a
                                      key={fileIdx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="chat-msg-attachment-file"
                                    >
                                      📄 {file.name}
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            {/* Actions on hover */}
                            {!msg.isDeleted && (
                              <div className="chat-msg-actions">
                                <button className="chat-msg-action-btn" title="Reply" onClick={() => setReplyTo(msg)}>↩</button>
                                <button className="chat-msg-action-btn" title="React" onClick={() => setReactingMsgId(msg.id)}>😊</button>
                                {isOwn && <button className="chat-msg-action-btn" title="Edit" onClick={() => { setEditingMsgId(msg.id); setEditText(msg.text); }}>✏️</button>}
                                {isOwn && <button className="chat-msg-action-btn" title="Delete" onClick={() => deleteMsg(msg.id)} style={{ color: '#f87171' }}>🗑</button>}
                              </div>
                            )}

                            {/* Inline Emoji Selector */}
                            {reactingMsgId === msg.id && (
                              <div className="chat-inline-emoji-picker">
                                {EMOJIS.map(e => (
                                  <span key={e} className="chat-emoji-option" onClick={() => { toggleReaction(msg.id, e); setReactingMsgId(null); }}>{e}</span>
                                ))}
                                <button className="chat-emoji-close" onClick={() => setReactingMsgId(null)}>✕</button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reactions List */}
                        {msg.reactions.length > 0 && (
                          <div className="chat-msg-reactions">
                            {Object.entries(msg.reactions.reduce<Record<string, { count: number; mine: boolean }>>((a, r) => {
                              if (!a[r.emoji]) a[r.emoji] = { count: 0, mine: false };
                              a[r.emoji].count++;
                              if (r.userId === userId) a[r.emoji].mine = true;
                              return a;
                            }, {})).map(([emoji, { count, mine }]) => (
                              <span key={emoji} className={`chat-reaction-pill${mine ? ' own' : ''}`} onClick={() => toggleReaction(msg.id, emoji)}>
                                {emoji}<span className="chat-reaction-count">{count}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="chat-msg-footer">
                          <span className="chat-msg-time">{fmtTime(msg.createdAt)}</span>
                          {isOwn && seen && <span className="chat-msg-read" style={{ color: '#818cf8', fontWeight: 600 }}>✓✓ Seen</span>}
                          {isOwn && !seen && <span className="chat-msg-time">✓ Sent</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Typing */}
          <div className="chat-typing-indicator">
            {whoTyping.length > 0 && `${whoTyping.map(id => `User ${id.slice(0,4)}`).join(', ')} ${whoTyping.length === 1 ? 'is' : 'are'} typing...`}
          </div>

          {/* Input area */}
          <div className="chat-input-area">
            {replyTo && (
              <div className="chat-reply-bar">
                ↩ <span>Replying: {replyTo.text.slice(0, 60)}{replyTo.text.length > 60 ? '…' : ''}</span>
                <button className="chat-reply-cancel" onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div className="chat-input-files-preview-row">
                {selectedFiles.map((file, idx) => {
                  const isImg = file.type === 'image' || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  return (
                    <div key={idx} className={`chat-input-file-preview-card ${isImg ? '' : 'file-doc'}`}>
                      {isImg ? (
                        <img src={file.url} alt={file.name} />
                      ) : (
                        <>
                          <span>📄</span>
                          <span style={{ fontSize: '9px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{file.name}</span>
                        </>
                      )}
                      <button className="chat-input-file-preview-delete" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="chat-input-row">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                onChange={handleUploadFiles}
              />
              <button 
                className="chat-attachment-btn" 
                title="Attach files"
                disabled={uploadingFiles}
                onClick={() => fileInputRef.current?.click()}
              >
                📎
              </button>

              <div style={{ position: 'relative', flex: 1, display: 'flex', gap: '6px' }}>
                <button className="chat-emoji-btn" onClick={() => setShowEmoji(p => !p)}>😊</button>
                {showEmoji && (
                  <div className="chat-emoji-picker" style={{ bottom: '48px', left: '0', position: 'absolute' }}>
                    {EMOJIS.map(e => (
                      <span key={e} className="chat-emoji-option" onClick={() => { setText(p => p + e); setShowEmoji(false); }}>{e}</span>
                    ))}
                  </div>
                )}
                <textarea
                  className="chat-input-box"
                  placeholder={uploadingFiles ? "Uploading files..." : `Message ${getConvName(activeConv)}...`}
                  value={text}
                  rows={1}
                  disabled={uploadingFiles}
                  onChange={e => handleTextChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                />
              </div>
              <button 
                className="chat-send-btn" 
                onClick={sendMsg} 
                disabled={(!text.trim() && selectedFiles.length === 0) || uploadingFiles}
              >
                {uploadingFiles ? '...' : '➤'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewDM && <NewDMModal userId={userId} onClose={() => setShowNewDM(false)} onCreated={c => { setConversations(p => [c, ...p.filter(x => x.id !== c.id)]); setActiveId(c.id); setShowNewDM(false); }} />}
      {showNewGroup && <NewGroupModal userId={userId} onClose={() => setShowNewGroup(false)} onCreated={c => { setConversations(p => [c, ...p.filter(x => x.id !== c.id)]); setActiveId(c.id); setShowNewGroup(false); }} />}
      {showAddMember && activeId && <AddMemberModal convId={activeId} userId={userId} onClose={() => setShowAddMember(false)} />}
      {showEditGroup && activeConv && <EditGroupModal conv={activeConv} userId={userId} onClose={() => setShowEditGroup(false)} onUpdated={c => { setConversations(p => p.map(x => x.id === c.id ? c : x)); setShowEditGroup(false); }} />}
      {showMembers && activeConv && <MembersModal conv={activeConv} userId={userId} onClose={() => setShowMembers(false)} onRemoved={() => loadConvs()} />}

      {/* Files/Images Group Preview Modal */}
      {previewGroup.length > 0 && previewIndex >= 0 && (
        <div className="chat-modal-overlay" onClick={() => { setPreviewGroup([]); setPreviewIndex(-1); }} style={{ zIndex: 1100 }}>
          <div className="chat-modal" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '90vw' }}>
            <div className="chat-modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>File Preview ({previewIndex + 1} of {previewGroup.length})</span>
              <button className="chat-emoji-close" style={{ fontSize: '18px' }} onClick={() => { setPreviewGroup([]); setPreviewIndex(-1); }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
              {previewGroup.length > 1 && (
                <button 
                  className="chat-btn-ghost" 
                  style={{ position: 'absolute', left: '10px', zIndex: 10 }}
                  onClick={() => setPreviewIndex(prev => (prev - 1 + previewGroup.length) % previewGroup.length)}
                >
                  ◀
                </button>
              )}

              {/* Preview Content */}
              {previewGroup[previewIndex].isImage ? (
                <img 
                  src={previewGroup[previewIndex].url} 
                  alt={previewGroup[previewIndex].name} 
                  style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '8px', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '48px' }}>📄</span>
                  <span style={{ fontSize: '14px', color: '#fff', textAlign: 'center', wordBreak: 'break-all' }}>
                    {previewGroup[previewIndex].name}
                  </span>
                  <a 
                    href={previewGroup[previewIndex].url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="chat-btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-block' }}
                  >
                    Open / Download File
                  </a>
                </div>
              )}

              {previewGroup.length > 1 && (
                <button 
                  className="chat-btn-ghost" 
                  style={{ position: 'absolute', right: '10px', zIndex: 10 }}
                  onClick={() => setPreviewIndex(prev => (prev + 1) % previewGroup.length)}
                >
                  ▶
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
