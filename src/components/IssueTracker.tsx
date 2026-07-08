import React, { useState, useEffect, useCallback } from 'react';
import './IssueTracker.css';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

const getUser = () => { try { const s = localStorage.getItem('synctab_user'); return s ? JSON.parse(s) : null; } catch { return null; } };
const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <div className="it-status-icon it-status-open" />,
  in_progress: <div className="it-status-icon it-status-in_progress">◑</div>,
  done: <div className="it-status-icon it-status-done" style={{ color: '#fff', fontSize: 10 }}>✓</div>,
  closed: <div className="it-status-icon it-status-closed" style={{ color: '#94a3b8', fontSize: 10 }}>—</div>,
};

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
const LABEL_OPTIONS = ['', 'bug', 'feature', 'enhancement', 'question', 'docs', 'chore'];
const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

type Project = { id: string; name: string; description: string; icon: string; color: string; ownerId: string; inviteToken: string; members: { userId: string; role: string }[]; _count: { issues: number } };
type Issue = { id: string; title: string; description: string; status: string; priority: string; label: string; projectId: string; creatorId: string; assigneeId?: string; dueDate?: string; closedAt?: string; createdAt: string; _count?: { comments: number }; comments?: Comment[] };
type Comment = { id: string; text: string; issueId: string; authorId: string; createdAt: string };

export const IssueTracker: React.FC = () => {
  const user = getUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
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
    const r = await fetch(`${API}/issues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: iTitle, description: iDesc, priority: iPriority, label: iLabel, projectId: selectedProjectId, creatorId: user.id, dueDate: iDue || undefined }) });
    if (r.ok) { await loadIssues(selectedProjectId); setShowNewIssue(false); setITitle(''); setIDesc(''); setIPriority('medium'); setILabel(''); setIDue(''); }
    setLoading(false);
  };

  const changeStatus = async (issueId: string, status: string) => {
    const r = await fetch(`${API}/issues/${issueId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (r.ok) {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status } : i));
      setSelectedIssue(prev => prev && prev.id === issueId ? { ...prev, status } : prev);
    }
  };

  const deleteIssue = async (id: string) => {
    await fetch(`${API}/issues/${id}`, { method: 'DELETE' });
    setIssues(prev => prev.filter(i => i.id !== id));
    if (selectedIssue?.id === id) setSelectedIssue(null);
    if (selectedProjectId) loadProjects();
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedIssue || !user) return;
    const r = await fetch(`${API}/issues/${selectedIssue.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newComment, authorId: user.id }) });
    if (r.ok) { setNewComment(''); loadComments(selectedIssue.id); }
  };

  const deleteComment = async (id: string) => {
    await fetch(`${API}/issue-comments/${id}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
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
                      {columnIssues.map(issue => (
                        <div key={issue.id} className={`it-issue-card ${issue.status === 'done' || issue.status === 'closed' ? 'done' : ''}`} onClick={() => setSelectedIssue(issue)}>
                          <div className="it-issue-tags">
                            <span className={`it-badge it-priority-${issue.priority}`}>• {issue.priority}</span>
                            {issue.label && <span className="it-badge it-label-badge">{issue.label}</span>}
                          </div>
                          <div className={`it-issue-title ${issue.status === 'done' || issue.status === 'closed' ? 'done' : ''}`}>
                            {issue.title}
                          </div>
                          <div className="it-issue-footer">
                            <span className="it-issue-id">ID-{issue.id.slice(0, 4).toUpperCase()}</span>
                            <div className="it-issue-avatar">{issue.creatorId.slice(0, 2).toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
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
              <div className="it-detail-header-title">{selectedIssue.title}</div>
              <button className="it-icon-btn" onClick={() => setSelectedIssue(null)}>✕</button>
            </div>
            
            <div className="it-detail-layout">
              <div className="it-detail-main">
                <div className="it-detail-section-label">Description</div>
                <div className="it-detail-desc">{selectedIssue.description || 'No description provided.'}</div>
                
                <div className="it-comments">
                  <div className="it-detail-section-label">Comments ({comments.length})</div>
                  {comments.map(c => (
                    <div key={c.id} className="it-comment">
                      <div className="it-comment-head">
                        <div className="it-issue-avatar">{c.authorId.slice(0, 2).toUpperCase()}</div>
                        <span className="it-comment-author">{c.authorId === user?.id ? 'You' : 'Teammate'}</span>
                        <span className="it-comment-time">{timeAgo(c.createdAt)}</span>
                        {c.authorId === user?.id && <button className="it-icon-btn danger" style={{ marginLeft: 'auto', padding: '4px' }} onClick={() => deleteComment(c.id)}>✕</button>}
                      </div>
                      <div className="it-comment-text">{c.text}</div>
                    </div>
                  ))}
                  
                  <div className="it-comment-input-box">
                    <textarea className="it-comment-textarea" placeholder="Describe the issue, steps to reproduce, or expected behavior..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment(); }} />
                    <div className="it-comment-actions">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="it-icon-btn">🖼 Upload Image</button>
                        <button className="it-icon-btn">🎥 Upload Video</button>
                      </div>
                      <button className="it-btn it-btn-primary" onClick={submitComment} disabled={!newComment.trim()}>Write</button>
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
                  <select className="it-form-select" value={selectedIssue.status} onChange={e => changeStatus(selectedIssue.id, e.target.value)}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Priority</div>
                  <div className="it-issue-tags">
                    <span className={`it-badge it-priority-${selectedIssue.priority}`}>• {selectedIssue.priority}</span>
                  </div>
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
                  <div className="it-issue-tags">
                    {selectedIssue.label && <span className="it-badge it-label-badge">{selectedIssue.label}</span>}
                    <button className="it-icon-btn" style={{ padding: '2px 8px', fontSize: 10 }}>+ Label</button>
                  </div>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Attachments</div>
                  <div className="it-upload-box">
                    📄 Drop files or click to upload
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
                  <select className="it-form-select" value={iPriority} onChange={e => setIPriority(e.target.value)}>
                    {PRIORITY_ORDER.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
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
                  <select className="it-form-select" value={iLabel} onChange={e => setILabel(e.target.value)}>
                    {LABEL_OPTIONS.map(l => <option key={l} value={l}>{l || 'None'}</option>)}
                  </select>
                </div>
                
                <div className="it-sidebar-box">
                  <div className="it-sidebar-box-title">Attachments</div>
                  <div className="it-upload-box">
                    📄 Drop files or click to upload
                  </div>
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
    </div>
  );
};

export default IssueTracker;
