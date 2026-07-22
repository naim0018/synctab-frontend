import React, { useState, useEffect } from 'react';
import { 
  parseDescriptionAndMedia, 
  serializeDescriptionAndMedia, 
  timeAgo, 
  fmtDate, 
  PrioritySelector, 
  LabelSelector
} from './SharedUI';
import type { MediaFile } from './SharedUI';

interface Comment {
  id: string;
  text: string;
  issueId: string;
  authorId: string;
  createdAt: string;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  label: string;
  projectId: string;
  creatorId: string;
  assigneeId?: string;
  dueDate?: string;
  closedAt?: string;
  updatedAt?: string;
  createdAt: string;
}

interface IssueDetailPaneProps {
  selectedIssue: Issue;
  onClose: () => void;
  onSaveIssue: (updatedFields: { title: string; description: string; status: string; priority: string; label: string }) => Promise<void>;
  onDeleteIssue: (id: string) => void;
  comments: Comment[];
  onAddComment: (text: string, files: Array<{ name: string; url: string }>) => Promise<void>;
  onEditComment: (id: string, text: string) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
  triggerUpload: (target: 'comment_image' | 'detail_attachment') => void;
  uploading: boolean;
  uploadTarget: 'comment_image' | 'detail_attachment' | 'new_attachment' | null;
  commentFiles: Array<{ name: string; url: string }>;
  setCommentFiles: React.Dispatch<React.SetStateAction<Array<{ name: string; url: string }>>>;
  onPreview: (group: Array<{ isImage: boolean; name: string; url: string }>, index: number) => void;
  selectedProjectName: string;
  currentUser: { id: string } | null;
  editMedia: MediaFile[];
  setEditMedia: React.Dispatch<React.SetStateAction<MediaFile[]>>;
}

const renderCommentText = (
  text: string, 
  onPreview?: (group: { isImage: boolean; name: string; url: string }[], index: number) => void
) => {
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

  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(<span key={`txt-${lastIndex}`}>{textBefore}</span>);
    }
    const isImage = match[1] === '!';
    const altOrName = match[2];
    const url = match[3];
    const currentIdx = matchIdx;

    if (isImage) {
      parts.push(
        <div 
          key={`img-${match.index}`} 
          style={{ marginTop: 8, cursor: 'pointer', maxWidth: '320px' }}
          onClick={() => onPreview?.(group, currentIdx)}
        >
          <img 
            src={url} 
            alt={altOrName} 
            style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', objectFit: 'contain' }}
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#a5b4fc',
            cursor: 'pointer',
            fontSize: '12px',
            marginTop: 6,
            marginRight: 6,
            transition: 'all 0.15s'
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

export const IssueDetailPane: React.FC<IssueDetailPaneProps> = ({
  selectedIssue,
  onClose,
  onSaveIssue,
  onDeleteIssue,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  triggerUpload,
  uploading,
  uploadTarget,
  commentFiles,
  setCommentFiles,
  onPreview,
  selectedProjectName,
  currentUser,
  editMedia,
  setEditMedia
}) => {
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('open');
  const [editPriority, setEditPriority] = useState('medium');
  const [editLabel, setEditLabel] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedIssue) {
      setEditTitle(selectedIssue.title || '');
      const { text } = parseDescriptionAndMedia(selectedIssue.description || '');
      setEditDesc(text);
      setEditStatus(selectedIssue.status || 'open');
      setEditPriority(selectedIssue.priority || 'medium');
      setEditLabel(selectedIssue.label || '');
    }
  }, [selectedIssue]);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const newRawDesc = serializeDescriptionAndMedia(editDesc, editMedia);
      await onSaveIssue({
        title: editTitle.trim(),
        description: newRawDesc,
        status: editStatus,
        priority: editPriority,
        label: editLabel
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommentEdit = async (cId: string) => {
    if (!editingCommentText.trim()) return;
    await onEditComment(cId, editingCommentText.trim());
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleAddCommentSubmit = async () => {
    if (!newComment.trim() && commentFiles.length === 0) return;
    await onAddComment(newComment.trim(), commentFiles);
    setNewComment('');
    setCommentFiles([]);
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    triggerUpload('detail_attachment');
  };

  return (
    <div className="it-detail-overlay" onClick={onClose}>
      <div className="it-detail-panel" onClick={e => e.stopPropagation()}>
        <div className="it-detail-header">
          <div className="it-detail-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'monospace', opacity: 0.5 }}>ID-{selectedIssue.id.substring(0, 8)}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>Issue Details</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="it-btn it-btn-primary" onClick={handleSave} disabled={saving || !editTitle.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="it-icon-btn" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
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
                            onPreview(group, idx);
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
                          style={{ cursor: 'pointer', fontSize: 32 }} 
                          onClick={() => {
                            const group = editMedia.map(m => ({
                              isImage: !!(m.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || m.url.startsWith('data:image/')),
                              name: m.name,
                              url: m.url
                            }));
                            onPreview(group, idx);
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
              
              <div 
                className="it-upload-box" 
                onClick={() => triggerUpload('detail_attachment')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropUpload}
                style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 140 }}
              >
                <span style={{ fontSize: 24, marginBottom: 4 }}>＋</span>
                <span>
                  {uploading && uploadTarget === 'detail_attachment' ? 'Uploading...' : 'Upload File'}
                </span>
              </div>
            </div>
            
            <div className="it-comments">
              <div className="it-detail-section-label">Comments ({comments.length})</div>
              {comments.map(c => (
                <div key={c.id} className="it-comment">
                  <div className="it-comment-head">
                    <div className="it-issue-avatar">{c.authorId.slice(0, 2).toUpperCase()}</div>
                    <span className="it-comment-author">{c.authorId === currentUser?.id ? 'You' : 'Teammate'}</span>
                    <span className="it-comment-time">{timeAgo(c.createdAt)}</span>
                    {c.authorId === currentUser?.id && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button 
                          className="it-icon-btn" 
                          style={{ padding: '4px 6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }} 
                          onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.text); }}
                        >
                          <span>✏️</span> Edit
                        </button>
                        <button className="it-icon-btn danger" style={{ padding: '4px' }} onClick={() => onDeleteComment(c.id)}>✕</button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === c.id ? (
                    <div style={{ marginTop: '8px' }}>
                      <textarea 
                        className="it-comment-textarea" 
                        value={editingCommentText} 
                        onChange={e => setEditingCommentText(e.target.value)} 
                        style={{ minHeight: '60px', width: '100%', padding: '8px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <button className="it-btn it-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}>Cancel</button>
                        <button className="it-btn it-btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleSaveCommentEdit(c.id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="it-comment-text" style={{ paddingLeft: 30 }}>
                      {renderCommentText(c.text, (group, index) => onPreview(group, index))}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="it-comment-input-box">
                <textarea 
                  className="it-comment-textarea" 
                  placeholder="Type comment here... (Ctrl+Enter to post)" 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddCommentSubmit(); }} 
                />
                
                {commentFiles.length > 0 && (
                  <div className="it-comment-images-preview-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 12px' }}>
                    {commentFiles.map((file, idx) => {
                      const isImg = file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || file.url.startsWith('data:image/');
                      return (
                        <div key={idx} className="it-comment-img-preview-container" style={{ position: 'relative', display: 'inline-block' }}>
                          {isImg ? (
                            <img src={file.url} alt="comment attachment" style={{ maxHeight: '80px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
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
                  <button className="it-icon-btn" onClick={() => triggerUpload('comment_image')}>📎 Attach File</button>
                  <button className="it-btn it-btn-primary" onClick={handleAddCommentSubmit} disabled={!newComment.trim() && commentFiles.length === 0}>
                    Write
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="it-detail-sidebar">
            <div className="it-sidebar-box">
              <div className="it-sidebar-box-title">Project</div>
              <select className="it-form-select" style={{ cursor: 'not-allowed', opacity: 0.6 }} disabled>
                <option>{selectedProjectName}</option>
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
              <PrioritySelector value={editPriority} onChange={setEditPriority} />
            </div>
            
            <div className="it-sidebar-box">
              <div className="it-sidebar-box-title">Assignee</div>
              <div className="it-assignee-box">
                <div className="it-issue-avatar">{selectedIssue.creatorId.slice(0, 2).toUpperCase()}</div>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Assignee</span>
              </div>
            </div>
            
            <div className="it-sidebar-box">
              <div className="it-sidebar-box-title">Labels</div>
              <LabelSelector value={editLabel} onChange={setEditLabel} />
            </div>

            <div className="it-sidebar-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>Created</span>
                <span style={{ fontSize: 12, color: '#fff' }}>{fmtDate(selectedIssue.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>Last Updated</span>
                <span style={{ fontSize: 12, color: '#fff' }}>{fmtDate(selectedIssue.updatedAt)}</span>
              </div>
              {(selectedIssue.status === 'done' || selectedIssue.status === 'closed') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: 10, color: selectedIssue.status === 'done' ? '#10b981' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {selectedIssue.status === 'done' ? 'Completed' : 'Closed'}
                  </span>
                  <span style={{ fontSize: 12, color: '#fff' }}>{fmtDate(selectedIssue.closedAt)}</span>
                </div>
              )}
            </div>
            
            <button 
              className="it-btn" 
              style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', justifyContent: 'center' }} 
              onClick={() => onDeleteIssue(selectedIssue.id)}
            >
              Delete Issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default IssueDetailPane;
