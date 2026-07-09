import React, { useState, useEffect, useCallback } from 'react';
import './IssueTracker.css';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

const getUser = () => { try { const s = localStorage.getItem('synctab_user'); return s ? JSON.parse(s) : null; } catch { return null; } };
const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };
const fmtDate = (d: string | undefined | null) => { if (!d) return '—'; const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`; };

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <div className="it-status-icon it-status-open" />,
  in_progress: <div className="it-status-icon it-status-in_progress">◑</div>,
  done: <div className="it-status-icon it-status-done" style={{ color: '#fff', fontSize: 10 }}>✓</div>,
  closed: <div className="it-status-icon it-status-closed" style={{ color: '#94a3b8', fontSize: 10 }}>—</div>,
};

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export type MediaFile = {
  name: string;
  url: string;
  note?: string;
};

export const parseDescriptionAndMedia = (rawDescription: string): { text: string; media: MediaFile[] } => {
  if (!rawDescription) return { text: '', media: [] };
  const regex = /<!-- SYNCTAB_MEDIA: ([\s\S]*?) -->/;
  const match = rawDescription.match(regex);
  if (match) {
    try {
      const media = JSON.parse(match[1]);
      const text = rawDescription.replace(regex, '').trim();
      return { text, media };
    } catch (e) {
      console.error('Failed to parse media JSON', e);
    }
  }
  return { text: rawDescription, media: [] };
};

export const serializeDescriptionAndMedia = (text: string, media: MediaFile[]): string => {
  if (media.length === 0) return text;
  return `${text}\n\n<!-- SYNCTAB_MEDIA: ${JSON.stringify(media)} -->`;
};

type Project = { id: string; name: string; description: string; icon: string; color: string; ownerId: string; inviteToken: string; members: { userId: string; role: string }[]; _count: { issues: number } };
type Issue = { id: string; title: string; description: string; status: string; priority: string; label: string; projectId: string; creatorId: string; assigneeId?: string; dueDate?: string; closedAt?: string; updatedAt?: string; createdAt: string; _count?: { comments: number }; comments?: Comment[] };
type Comment = { id: string; text: string; issueId: string; authorId: string; createdAt: string };

const renderCommentText = (text: string, onPreview?: (group: { isImage: boolean; name: string; url: string }[], index: number) => void) => {
  if (!text) return null;
  const regex = /(!)?\[(.*?)\]\((.*?)\)/g;
  const matches = [...text.matchAll(regex)];
  const group = matches.map(m => ({
    isImage: m[1] === '!',
    name: m[2],
    url: m[3]
  }));

  const parts = [];
  let lastIndex = 0;
  let match;
  let matchIdx = 0;

  // Reset regex index to search again
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(<span key={`txt-${lastIndex}`}>{textBefore}</span>);
    }
    const isImage = match[1] === '!';
    const altOrName = match[2];
    const url = match[3];
    const currentIdx = matchIdx; // capture current index

    if (isImage) {
      parts.push(
        <div key={`img-${match.index}`} className="it-comment-image-container" style={{ marginTop: '8px', cursor: 'pointer' }} onClick={() => onPreview?.(group, currentIdx)}>
          <img 
            src={url} 
            alt={altOrName} 
            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} 
          />
        </div>
      );
    } else {
      const isDoc = altOrName.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip)/i);
      const icon = isDoc ? '📄' : '🔗';
      parts.push(
        <span 
          key={`lnk-${match.index}`} 
          onClick={() => onPreview?.(group, currentIdx)}
          className="it-comment-file-link"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '6px 12px', 
            borderRadius: '6px', 
            color: '#a5b4fc', 
            cursor: 'pointer',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.08)',
            marginTop: '6px',
            marginRight: '6px'
          }}
        >
          <span>{icon}</span>
          <span>{altOrName}</span>
        </span>
      );
    }
    matchIdx++;
    lastIndex = regex.lastIndex;
  }

  const textAfter = text.substring(lastIndex);
  if (textAfter) {
    parts.push(<span key={`txt-${lastIndex}`}>{textAfter}</span>);
  }

  return parts.length > 0 ? parts : text;
};

export const IssueTracker: React.FC = () => {
  const user = getUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'comment_image' | 'detail_attachment' | 'new_attachment' | null>(null);
  const [uploading, setUploading] = useState(false);

  const triggerUpload = (target: 'comment_image' | 'detail_attachment' | 'new_attachment') => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const r = await fetch(`${API}/upload`, {
        method: 'POST',
        body: formData
      });
      if (r.ok) {
        const res = await r.json();
        return res.data?.url || res.url || null;
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    
    const url = await uploadFile(file);
    if (!url) return;

    if (uploadTarget === 'comment_image') {
      setCommentFiles(prev => [...prev, { name: file.name, url }]);
    } else if (uploadTarget === 'new_attachment') {
      setUploadedFiles(prev => [...prev, { name: file.name, url, note: '' }]);
    } else if (uploadTarget === 'detail_attachment') {
      setEditMedia(prev => [...prev, { name: file.name, url, note: '' }]);
    }

    e.target.value = '';
    setUploadTarget(null);
  };

  const handleDropUpload = async (e: React.DragEvent<HTMLDivElement>, target: 'detail_attachment' | 'new_attachment') => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const url = await uploadFile(file);
    if (!url) return;

    if (target === 'new_attachment') {
      setUploadedFiles(prev => [...prev, { name: file.name, url, note: '' }]);
    } else if (target === 'detail_attachment') {
      setEditMedia(prev => [...prev, { name: file.name, url, note: '' }]);
    }
  };

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentFiles, setCommentFiles] = useState<MediaFile[]>([]);
  const [previewGroup, setPreviewGroup] = useState<{ isImage: boolean; name: string; url: string }[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [loading, setLoading] = useState(false);

  // New project form
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pIcon, setPIcon] = useState('🗂️');
  const [pColor, setPColor] = useState('#6366f1');

  // New issue form
  const [iTitle, setITitle] = useState('');
  const [iDesc, setIDesc] = useState('');
  const [iPriority, setIPriority] = useState('medium');
  const [iLabel, setILabel] = useState('');
  const [iDue, setIDue] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);

  // Edit issue form (Detail Panel)
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMedia, setEditMedia] = useState<MediaFile[]>([]);
  const [editPriority, setEditPriority] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const r = await fetch(`${API}/issue-projects?userId=${user.id}`);
    if (r.ok) { const d = await r.json(); setProjects(Array.isArray(d.data) ? d.data : d); }
  }, [user?.id]);

  const loadIssues = useCallback(async (projectId: string) => {
    const r = await fetch(`${API}/issues?projectId=${projectId}`);
    if (r.ok) { const d = await r.json(); setIssues(Array.isArray(d.data) ? d.data : d); }
  }, []);

  const loadComments = useCallback(async (issueId: string) => {
    const r = await fetch(`${API}/issues/${issueId}/comments`);
    if (r.ok) { const d = await r.json(); setComments(Array.isArray(d.data) ? d.data : d); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selectedProjectId) loadIssues(selectedProjectId); else setIssues([]); }, [selectedProjectId, loadIssues]);
  useEffect(() => { if (selectedIssue) loadComments(selectedIssue.id); }, [selectedIssue?.id, loadComments]);

  useEffect(() => {
    if (selectedIssue) {
      const { text, media } = parseDescriptionAndMedia(selectedIssue.description);
      setEditTitle(selectedIssue.title);
      setEditDesc(text);
      setEditMedia(media);
      setEditPriority(selectedIssue.priority);
      setEditLabel(selectedIssue.label);
      setEditStatus(selectedIssue.status);
    } else {
      setEditTitle('');
      setEditDesc('');
      setEditMedia([]);
      setEditPriority('');
      setEditLabel('');
      setEditStatus('');
    }
  }, [selectedIssue]);

  const createProject = async () => {
    if (!pName.trim() || !user) return;
    setLoading(true);
    const r = await fetch(`${API}/issue-projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: pName, description: pDesc, icon: pIcon, color: pColor, ownerId: user.id }) });
    if (r.ok) { await loadProjects(); setShowNewProject(false); setPName(''); setPDesc(''); setPIcon('🗂️'); setPColor('#6366f1'); }
    setLoading(false);
  };

  const createIssue = async () => {
    if (!iTitle.trim() || !selectedProjectId || !user) return;
    setLoading(true);
    const newDescription = serializeDescriptionAndMedia(iDesc, uploadedFiles);
    const r = await fetch(`${API}/issues`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        title: iTitle, 
        description: newDescription, 
        priority: iPriority, 
        label: iLabel, 
        projectId: selectedProjectId, 
        creatorId: user.id, 
        dueDate: iDue || undefined 
      }) 
    });
    if (r.ok) { 
      await loadIssues(selectedProjectId); 
      setShowNewIssue(false); 
      setITitle(''); 
      setIDesc(''); 
      setIPriority('medium'); 
      setILabel(''); 
      setIDue(''); 
      setUploadedFiles([]);
    }
    setLoading(false);
  };

  const saveIssueDetails = async () => {
    if (!selectedIssue || !selectedProjectId) return;
    setLoading(true);
    const newDescription = serializeDescriptionAndMedia(editDesc, editMedia);
    const r = await fetch(`${API}/issues/${selectedIssue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: newDescription,
        status: editStatus,
        priority: editPriority,
        label: editLabel
      })
    });
    if (r.ok) {
      await loadIssues(selectedProjectId);
      setSelectedIssue(null);
    }
    setLoading(false);
  };

  const deleteIssue = async (id: string) => {
    await fetch(`${API}/issues/${id}`, { method: 'DELETE' });
    setIssues(prev => prev.filter(i => i.id !== id));
    if (selectedIssue?.id === id) setSelectedIssue(null);
    if (selectedProjectId) loadProjects();
  };

  const submitComment = async () => {
    if ((!newComment.trim() && commentFiles.length === 0) || !selectedIssue || !user) return;
    let bodyText = newComment;
    if (commentFiles.length > 0) {
      const attachmentsText = commentFiles.map(file => {
        const isImg = file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || file.url.startsWith('data:image/');
        return isImg ? `![${file.name}](${file.url})` : `[${file.name}](${file.url})`;
      }).join('\n');
      bodyText += '\n\n' + attachmentsText;
    }
    const r = await fetch(`${API}/issues/${selectedIssue.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: bodyText, authorId: user.id }) });
    if (r.ok) { 
      setNewComment(''); 
      setCommentFiles([]);
      loadComments(selectedIssue.id); 
    }
  };

  const deleteComment = async (id: string) => {
    await fetch(`${API}/issue-comments/${id}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    const r = await fetch(`${API}/issue-comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editingCommentText })
    });
    if (r.ok) {
      setEditingCommentId(null);
      setEditingCommentText('');
      if (selectedIssue) loadComments(selectedIssue.id);
    }
  };

  const joinProject = async () => {
    if (!joinToken.trim() || !user) return;
    const r = await fetch(`${API}/issue-projects/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: joinToken.trim(), userId: user.id }) });
    if (r.ok) { await loadProjects(); setShowJoin(false); setJoinToken(''); }
  };

  const regenerateToken = async () => {
    if (!selectedProject) return;
    const r = await fetch(`${API}/issue-projects/${selectedProject.id}/regenerate-token`, { method: 'POST' });
    if (r.ok) { loadProjects(); }
  };

  const filtered = issues.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderPriorityGrid = (currentValue: string, onChange: (val: string) => void) => {
    const priorities = [
      { value: 'critical', label: 'Urgent', color: '#ff4b4b' },
      { value: 'high', label: 'High', color: '#fb923c' },
      { value: 'medium', label: 'Normal', color: '#e2e8f0' },
      { value: 'low', label: 'Low', color: '#64748b' }
    ];

    return (
      <div className="it-priority-grid">
        {priorities.map(p => {
          const isSelected = currentValue === p.value;
          return (
            <button
              key={p.value}
              type="button"
              className={`it-priority-grid-btn ${isSelected ? 'active' : ''} it-priority-grid-${p.value}`}
              onClick={() => onChange(p.value)}
            >
              <span className="it-priority-dot" style={{ backgroundColor: p.color }} />
              <span className="it-priority-text">{p.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderLabelSelector = (currentValue: string, onChange: (val: string) => void) => {
    const labels = [
      { value: 'bug', label: 'Bug', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
      { value: 'feature', label: 'Feature', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
      { value: 'enhancement', label: 'Enhancement', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
      { value: 'question', label: 'Question', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
      { value: 'docs', label: 'Docs', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
      { value: 'chore', label: 'Chore', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' }
    ];

    return (
      <div className="it-labels-selector">
        {labels.map(l => {
          const isSelected = currentValue === l.value;
          return (
            <button
              key={l.value}
              type="button"
              className={`it-label-tag-btn ${isSelected ? 'active' : ''}`}
              style={{
                borderColor: isSelected ? l.color : 'rgba(255, 255, 255, 0.08)',
                color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                background: isSelected ? l.bg : 'rgba(255, 255, 255, 0.02)'
              }}
              onClick={() => onChange(isSelected ? '' : l.value)}
            >
              <span className="it-label-tag-dot" style={{ backgroundColor: l.color }} />
              {l.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="it-root">
      {/* Sidebar */}
      <div className="it-sidebar">
        <div className="it-sidebar-header">
          <span className="it-sidebar-title">Projects</span>
          <button className="it-sidebar-new-btn" onClick={() => setShowNewProject(true)} title="New Project">＋</button>
        </div>
        <div className="it-sidebar-projects">
          {projects.map(p => (
            <div key={p.id} className={`it-project-item ${selectedProjectId === p.id ? 'active' : ''}`} onClick={() => setSelectedProjectId(p.id)}>
              <div className="it-project-dot" style={{ background: p.color }} />
              <span style={{ fontSize: 15 }}>{p.icon}</span>
              <span className="it-project-name">{p.name}</span>
              <span className="it-project-count">{p._count?.issues ?? 0}</span>
            </div>
          ))}
          {projects.length === 0 && <div style={{ padding: '12px 8px', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>No projects yet</div>}
        </div>
        <div className="it-sidebar-join">
          <button className="it-sidebar-join-btn" onClick={() => setShowJoin(true)}>🔗 Join via invite link</button>
        </div>
      </div>

      {/* Main */}
      <div className="it-main">
        {!selectedProject ? (
          <div className="it-no-project">
            <div className="it-no-project-icon">🗂️</div>
            <div className="it-no-project-title">Select or create a project</div>
            <div className="it-no-project-sub">Track and resolve issues with your team</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="it-btn it-btn-primary" onClick={() => setShowNewProject(true)}>＋ New Project</button>
              <button className="it-btn it-btn-ghost" onClick={() => setShowJoin(true)}>🔗 Join Project</button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="it-header">
              <div className="it-header-icon">{selectedProject.icon}</div>
              <div className="it-header-info">
                <div className="it-header-name">{selectedProject.name}</div>
                {selectedProject.description && <div className="it-header-desc">{selectedProject.description}</div>}
              </div>
              <div className="it-header-actions">
                <button className="it-btn it-btn-ghost" onClick={() => setShowInvite(true)} title="Invite teammates">🔗 Invite</button>
                <button className="it-btn it-btn-primary" onClick={() => setShowNewIssue(true)}>＋ New Issue</button>
              </div>
            </div>

            {/* Filters */}
            <div className="it-filters">
              <input className="it-search" placeholder="Search issues…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Kanban Board */}
            <div className="it-kanban">
              {['open', 'in_progress', 'done', 'closed'].map(statusKey => {
                const columnIssues = filtered.filter(i => i.status === statusKey);
                const title = statusKey === 'open' ? 'Open' : statusKey === 'in_progress' ? 'In Progress' : statusKey === 'done' ? 'Done' : 'Closed';
                return (
                  <div key={statusKey} className="it-kanban-column">
                    <div className="it-kanban-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {STATUS_ICONS[statusKey] ?? STATUS_ICONS.open}
                        <span className="it-kanban-title">{title}</span>
                      </div>
                      <span className="it-kanban-count">{columnIssues.length}</span>
                    </div>
                    <div className="it-kanban-body">
                      {columnIssues.map(issue => {
                        const { media: cardMedia } = parseDescriptionAndMedia(issue.description);
                        return (
                          <div key={issue.id} className={`it-issue-card ${issue.status === 'done' || issue.status === 'closed' ? 'done' : ''}`} onClick={async () => { const r = await fetch(`${API}/issues/${issue.id}`); if (r.ok) { const d = await r.json(); setSelectedIssue(d.data || d); } else { setSelectedIssue(issue); } }}>
                            <div className="it-issue-tags">
                              <span className={`it-badge it-priority-${issue.priority}`}>• {issue.priority}</span>
                              {issue.label && <span className="it-badge it-label-badge">{issue.label}</span>}
                            </div>
                            <div className={`it-issue-title ${issue.status === 'done' || issue.status === 'closed' ? 'done' : ''}`}>
                              {issue.title}
                            </div>
                            <div className="it-issue-footer">
                              <span className="it-issue-id">ID-{issue.id.slice(0, 4).toUpperCase()}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {cardMedia.length > 0 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}>📎 {cardMedia.length}</span>}
                                <div className="it-issue-avatar">{issue.creatorId.slice(0, 2).toUpperCase()}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <div className="it-detail-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="it-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="it-detail-header">
              <div className="it-detail-header-title" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>ID-{selectedIssue.id.slice(0, 4).toUpperCase()}</span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                <span>Issue Details</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="it-btn it-btn-primary" onClick={saveIssueDetails} disabled={loading || !editTitle.trim()}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button className="it-icon-btn" onClick={() => setSelectedIssue(null)}>✕</button>
              </div>
            </div>
            
            <div className="it-detail-layout">
              <div className="it-detail-main">
                <div className="it-detail-section-label">Title</div>
                <input 
                  type="text" 
                  className="it-form-input" 
                  style={{ width: '100%', marginBottom: 16, fontSize: 16, fontWeight: 'bold' }} 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  placeholder="Issue title"
                />

                <div className="it-detail-section-label">Description</div>
                <textarea 
                  className="it-form-textarea" 
                  style={{ width: '100%', minHeight: 120, marginBottom: 16 }} 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                  placeholder="Describe the issue, steps to reproduce, or expected behavior..."
                />

                <div className="it-detail-section-label">Media</div>
                <div className="it-media-grid" style={{ marginBottom: 16 }}>
                  {editMedia.map((file, idx) => {
                    const isImg = file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || file.url.startsWith('data:image/');
                    const isVid = file.url.match(/\.(mp4|webm|ogg|mov)/i) || file.url.startsWith('data:video/');
                    
                    return (
                      <div key={idx} className="it-media-card">
                        <button 
                          type="button" 
                          className="it-media-delete-btn" 
                          onClick={() => setEditMedia(prev => prev.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                        <div className="it-media-preview-container">
                          {isImg ? (
                            <img 
                              src={file.url} 
                              alt={file.name} 
                              className="it-media-preview" 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                const group = editMedia.map(m => ({
                                  isImage: !!(m.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || m.url.startsWith('data:image/')),
                                  name: m.name,
                                  url: m.url
                                }));
                                setPreviewGroup(group);
                                setPreviewIndex(idx);
                              }} 
                            />
                          ) : isVid ? (
                            <div className="it-media-video-wrapper">
                              <video src={file.url} className="it-media-preview" muted />
                              <div className="it-media-play-overlay">▶</div>
                            </div>
                          ) : (
                            <div 
                              className="it-media-file-icon" 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                const group = editMedia.map(m => ({
                                  isImage: !!(m.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || m.url.startsWith('data:image/')),
                                  name: m.name,
                                  url: m.url
                                }));
                                setPreviewGroup(group);
                                setPreviewIndex(idx);
                              }}
                            >
                              📄
                            </div>
                          )}
                        </div>
                        <div className="it-media-info">
                          <span className="it-media-filename" title={file.name}>{file.name}</span>
                          <input 
                            type="text" 
                            className="it-media-note-input" 
                            placeholder="Add a note..." 
                            value={file.note || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditMedia(prev => prev.map((item, i) => i === idx ? { ...item, note: val } : item));
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                </div>
                
                <div className="it-comments">
                  <div className="it-detail-section-label">Comments ({comments.length})</div>
                  {comments.map(c => (
                    <div key={c.id} className="it-comment">
                      <div className="it-comment-head">
                        <div className="it-issue-avatar">{c.authorId.slice(0, 2).toUpperCase()}</div>
                        <span className="it-comment-author">{c.authorId === user?.id ? 'You' : 'Teammate'}</span>
                        <span className="it-comment-time">{timeAgo(c.createdAt)}</span>
                        {c.authorId === user?.id && (
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button 
                              className="it-icon-btn" 
                              style={{ padding: '4px 6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }} 
                              onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.text); }}
                            >
                              <span>✏️</span> Edit
                            </button>
                            <button className="it-icon-btn danger" style={{ padding: '4px' }} onClick={() => deleteComment(c.id)}>✕</button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === c.id ? (
                        <div style={{ marginTop: '8px' }}>
                          <textarea 
                            className="it-comment-textarea" 
                            value={editingCommentText} 
                            onChange={e => setEditingCommentText(e.target.value)} 
                            style={{ minHeight: '60px', width: '100%', padding: '8px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button className="it-btn it-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}>Cancel</button>
                            <button className="it-btn it-btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => saveCommentEdit(c.id)}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="it-comment-text">{renderCommentText(c.text, (group, index) => { setPreviewGroup(group); setPreviewIndex(index); })}</div>
                      )}
                    </div>
                  ))}
                  
                  <div className="it-comment-input-box">
                    <textarea className="it-comment-textarea" placeholder="Describe the issue, steps to reproduce, or expected behavior..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment(); }} />
                    
                    {commentFiles.length > 0 && (
                      <div className="it-comment-images-preview-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 12px' }}>
                        {commentFiles.map((file, idx) => {
                          const isImg = file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || file.url.startsWith('data:image/');
                          return (
                            <div key={idx} className="it-comment-img-preview-container" style={{ position: 'relative', display: 'inline-block' }}>
                              {isImg ? (
                                <img src={file.url} alt="uploaded comment" style={{ maxHeight: '80px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                              ) : (
                                <div style={{ 
                                  height: '80px', 
                                  padding: '12px', 
                                  background: 'rgba(255,255,255,0.05)', 
                                  border: '1px solid rgba(255,255,255,0.1)', 
                                  borderRadius: '6px', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  justifyContent: 'center', 
                                  alignItems: 'center',
                                  gap: '4px',
                                  minWidth: '100px'
                                }}>
                                  <span style={{ fontSize: '20px' }}>📄</span>
                                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>{file.name}</span>
                                </div>
                              )}
                              <button 
                                type="button"
                                className="it-media-delete-btn" 
                                style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', fontSize: '10px' }}
                                onClick={() => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="it-comment-actions">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="it-icon-btn" onClick={() => triggerUpload('comment_image')}>📎 Attach File</button>
                      </div>
                      <button className="it-btn it-btn-primary" onClick={submitComment} disabled={!newComment.trim() && commentFiles.length === 0}>Write</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="it-detail-sidebar">
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Project</div>
                  <select className="it-form-select" disabled>
                    <option>{selectedProject?.name}</option>
                  </select>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Status</div>
                  <select className="it-form-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Priority</div>
                  {renderPriorityGrid(editPriority, setEditPriority)}
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Assignee</div>
                  <div className="it-assignee-box">
                    <div className="it-issue-avatar">{selectedIssue.creatorId.slice(0, 2).toUpperCase()}</div>
                    <span style={{ fontSize: 13, color: '#fff' }}>Assignee</span>
                  </div>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Labels</div>
                  {renderLabelSelector(editLabel, setEditLabel)}
                </div>

                <div className="it-sidebar-box" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Created</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(selectedIssue.createdAt)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Last Updated</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(selectedIssue.updatedAt)}</span>
                    </div>
                    {(selectedIssue.status === 'done' || selectedIssue.status === 'closed') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: selectedIssue.status === 'done' ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)' }}>
                          {selectedIssue.status === 'done' ? 'Completed' : 'Closed'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(selectedIssue.closedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button className="it-btn it-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => deleteIssue(selectedIssue.id)}>Delete Issue</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="it-modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="it-modal" onClick={e => e.stopPropagation()}>
            <div className="it-modal-header"><span className="it-modal-title">New Project</span><button className="it-icon-btn" onClick={() => setShowNewProject(false)}>✕</button></div>
            <div className="it-modal-body">
              <div className="it-form-group"><label className="it-form-label">Name</label><input className="it-form-input" placeholder="Project name" value={pName} onChange={e => setPName(e.target.value)} autoFocus /></div>
              <div className="it-form-group"><label className="it-form-label">Description</label><textarea className="it-form-textarea" placeholder="What is this project about?" value={pDesc} onChange={e => setPDesc(e.target.value)} /></div>
              <div className="it-form-row">
                <div className="it-form-group"><label className="it-form-label">Icon (emoji)</label><input className="it-form-input" value={pIcon} onChange={e => setPIcon(e.target.value)} style={{ fontSize: 20, textAlign: 'center' }} /></div>
                <div className="it-form-group"><label className="it-form-label">Color</label><div className="it-color-picker-row">{PROJECT_COLORS.map(c => <div key={c} className={`it-color-swatch ${pColor === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setPColor(c)} />)}</div></div>
              </div>
            </div>
            <div className="it-modal-footer">
              <button className="it-btn it-btn-ghost" onClick={() => setShowNewProject(false)}>Cancel</button>
              <button className="it-btn it-btn-primary" onClick={createProject} disabled={!pName.trim() || loading}>Create Project</button>
            </div>
          </div>
        </div>
      )}

      {/* New Issue Modal */}
      {showNewIssue && (
        <div className="it-detail-overlay" onClick={() => setShowNewIssue(false)}>
          <div className="it-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="it-detail-header">
              <div className="it-detail-header-title">Create New Issue</div>
              <button className="it-icon-btn" onClick={() => setShowNewIssue(false)}>✕</button>
            </div>
            
            <div className="it-detail-layout">
              <div className="it-detail-main">
                <div className="it-form-group">
                  <label className="it-form-label">Issue Title</label>
                  <input className="it-form-input" placeholder="e.g., [API] Support for batch processing endpoints" value={iTitle} onChange={e => setITitle(e.target.value)} autoFocus />
                </div>
                
                <div className="it-form-group">
                  <label className="it-form-label">Description</label>
                  <div className="it-comment-input-box" style={{ marginTop: 0 }}>
                    <div className="it-comment-actions" style={{ borderTop: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 0, paddingBottom: 12, marginBottom: 12 }}>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="it-icon-btn"><b>B</b></button>
                          <button className="it-icon-btn"><i>I</i></button>
                          <button className="it-icon-btn">&lt;&gt;</button>
                          <button className="it-icon-btn">🔗</button>
                       </div>
                    </div>
                    <textarea className="it-comment-textarea" placeholder="Describe the issue, steps to reproduce, or expected behavior..." value={iDesc} onChange={e => setIDesc(e.target.value)} style={{ minHeight: 150 }} />
                  </div>
                </div>

                <div className="it-form-group">
                  <label className="it-form-label">Media</label>
                  <div className="it-media-grid">
                    {uploadedFiles.map((file, idx) => {
                      const isImg = file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || file.url.startsWith('data:image/');
                      const isVid = file.url.match(/\.(mp4|webm|ogg|mov)/i) || file.url.startsWith('data:video/');
                      
                      return (
                        <div key={idx} className="it-media-card">
                          <button 
                            type="button" 
                            className="it-media-delete-btn" 
                            onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                          <div className="it-media-preview-container">
                            {isImg ? (
                              <img 
                                src={file.url} 
                                alt={file.name} 
                                className="it-media-preview" 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => {
                                  const group = uploadedFiles.map(m => ({
                                    isImage: !!(m.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || m.url.startsWith('data:image/')),
                                    name: m.name,
                                    url: m.url
                                  }));
                                  setPreviewGroup(group);
                                  setPreviewIndex(idx);
                                }} 
                              />
                            ) : isVid ? (
                              <div className="it-media-video-wrapper">
                                <video src={file.url} className="it-media-preview" muted />
                                <div className="it-media-play-overlay">▶</div>
                              </div>
                            ) : (
                              <div 
                                className="it-media-file-icon" 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => {
                                  const group = uploadedFiles.map(m => ({
                                    isImage: !!(m.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || m.url.startsWith('data:image/')),
                                    name: m.name,
                                    url: m.url
                                  }));
                                  setPreviewGroup(group);
                                  setPreviewIndex(idx);
                                }}
                              >
                                📄
                              </div>
                            )}
                          </div>
                          <div className="it-media-info">
                            <span className="it-media-filename" title={file.name}>{file.name}</span>
                            <input 
                              type="text" 
                              className="it-media-note-input" 
                              placeholder="Add a note..." 
                              value={file.note || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setUploadedFiles(prev => prev.map((item, i) => i === idx ? { ...item, note: val } : item));
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                    
                    <div 
                      className="it-media-add-card" 
                      onClick={() => triggerUpload('new_attachment')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropUpload(e, 'new_attachment')}
                    >
                      <div className="it-media-add-plus">＋</div>
                      <div className="it-media-add-text">
                        {uploading && uploadTarget === 'new_attachment' ? 'Uploading...' : 'Upload File'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button className="it-btn it-btn-ghost" onClick={() => setShowNewIssue(false)}>Cancel</button>
                  <button className="it-btn it-btn-primary" onClick={createIssue} disabled={!iTitle.trim() || loading}>Create Issue 🚀</button>
                </div>
              </div>
              
              <div className="it-detail-sidebar">
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Project</div>
                  <select className="it-form-select" disabled>
                    <option>{selectedProject?.name}</option>
                  </select>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Priority</div>
                  {renderPriorityGrid(iPriority, setIPriority)}
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Assignee</div>
                  <div className="it-assignee-box">
                    <div className="it-issue-avatar">{user?.id.slice(0, 2).toUpperCase() || 'U'}</div>
                    <span style={{ fontSize: 13, color: '#fff' }}>Assign to me</span>
                  </div>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Labels</div>
                  {renderLabelSelector(iLabel, setILabel)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Project Modal */}
      {showJoin && (
        <div className="it-modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="it-modal" onClick={e => e.stopPropagation()}>
            <div className="it-modal-header"><span className="it-modal-title">Join a Project</span><button className="it-icon-btn" onClick={() => setShowJoin(false)}>✕</button></div>
            <div className="it-modal-body">
              <div className="it-form-group"><label className="it-form-label">Invite Token</label><input className="it-form-input" placeholder="Paste invite token here" value={joinToken} onChange={e => setJoinToken(e.target.value)} autoFocus /></div>
            </div>
            <div className="it-modal-footer">
              <button className="it-btn it-btn-ghost" onClick={() => setShowJoin(false)}>Cancel</button>
              <button className="it-btn it-btn-primary" onClick={joinProject} disabled={!joinToken.trim()}>Join</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && selectedProject && (
        <div className="it-modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="it-modal" onClick={e => e.stopPropagation()}>
            <div className="it-modal-header"><span className="it-modal-title">Invite Teammates</span><button className="it-icon-btn" onClick={() => setShowInvite(false)}>✕</button></div>
            <div className="it-modal-body">
              <div className="it-invite-box">
                <div className="it-invite-label">Invite Token — share this with your teammates</div>
                <div className="it-invite-token">{selectedProject.inviteToken}</div>
                <div className="it-invite-actions">
                  <button className="it-btn it-btn-ghost" style={{ fontSize: 11 }} onClick={() => navigator.clipboard.writeText(selectedProject.inviteToken)}>📋 Copy</button>
                  <button className="it-btn it-btn-ghost" style={{ fontSize: 11 }} onClick={regenerateToken}>🔄 Regenerate</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Members: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedProject.members?.length ?? 1}</strong></div>
            </div>
            <div className="it-modal-footer"><button className="it-btn it-btn-primary" onClick={() => setShowInvite(false)}>Done</button></div>
          </div>
        </div>
      )}
      {/* Files/Images Group Preview Modal */}
      {previewGroup.length > 0 && previewIndex >= 0 && (
        <div className="it-modal-overlay" onClick={() => { setPreviewGroup([]); setPreviewIndex(-1); }} style={{ zIndex: 1100 }}>
          <div className="it-modal" style={{ maxWidth: '80vw', maxHeight: '80vh', padding: '16px', background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="it-modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <span className="it-modal-title">File Preview ({previewIndex + 1} of {previewGroup.length})</span>
              <button className="it-icon-btn" onClick={() => { setPreviewGroup([]); setPreviewIndex(-1); }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center', minHeight: '300px', padding: '16px 0' }}>
              {/* Left Arrow */}
              {previewGroup.length > 1 && (
                <button 
                  className="it-icon-btn" 
                  style={{ position: 'absolute', left: '8px', fontSize: '24px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
                  onClick={() => setPreviewIndex(prev => (prev - 1 + previewGroup.length) % previewGroup.length)}
                >
                  ◀
                </button>
              )}

              {/* Preview Content */}
              {previewGroup[previewIndex].isImage ? (
                <img src={previewGroup[previewIndex].url} alt={previewGroup[previewIndex].name} style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '8px', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '72px' }}>📄</span>
                  <span style={{ fontSize: '18px', color: '#fff', textAlign: 'center', maxWidth: '400px', wordBreak: 'break-all' }}>{previewGroup[previewIndex].name}</span>
                  <a 
                    href={previewGroup[previewIndex].url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="it-btn it-btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>📥</span> Download / Open File
                  </a>
                </div>
              )}

              {/* Right Arrow */}
              {previewGroup.length > 1 && (
                <button 
                  className="it-icon-btn" 
                  style={{ position: 'absolute', right: '8px', fontSize: '24px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
                  onClick={() => setPreviewIndex(prev => (prev + 1) % previewGroup.length)}
                >
                  ▶
                </button>
              )}
            </div>

            {/* Thumbnail list of other files in the comment */}
            {previewGroup.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {previewGroup.map((file, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      cursor: 'pointer', 
                      border: idx === previewIndex ? '2px solid #6366f1' : '2px solid transparent', 
                      borderRadius: '4px',
                      padding: '2px',
                      background: 'rgba(255,255,255,0.02)'
                    }}
                    onClick={() => setPreviewIndex(idx)}
                  >
                    {file.isImage ? (
                      <img src={file.url} alt={file.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '2px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>📄</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />
    </div>
  );
};

export default IssueTracker;
