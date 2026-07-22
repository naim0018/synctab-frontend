import React, { useState } from 'react';
import { PrioritySelector, LabelSelector, serializeDescriptionAndMedia } from './SharedUI';

interface NewIssuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectName: string;
  currentUser: { id: string } | null;
  onCreateIssue: (title: string, description: string, priority: string, label: string) => Promise<void>;
  triggerUpload: (target: 'new_attachment') => void;
  uploading: boolean;
  uploadTarget: 'comment_image' | 'detail_attachment' | 'new_attachment' | null;
  uploadedFiles: Array<{ name: string; url: string; note?: string }>;
  setUploadedFiles: React.Dispatch<React.SetStateAction<Array<{ name: string; url: string; note?: string }>>>;
  onPreview: (group: Array<{ isImage: boolean; name: string; url: string }>, index: number) => void;
}

export const NewIssuePanel: React.FC<NewIssuePanelProps> = ({
  isOpen,
  onClose,
  selectedProjectName,
  currentUser,
  onCreateIssue,
  triggerUpload,
  uploading,
  uploadTarget,
  uploadedFiles,
  setUploadedFiles,
  onPreview
}) => {
  const [iTitle, setITitle] = useState('');
  const [iDesc, setIDesc] = useState('');
  const [iPriority, setIPriority] = useState('medium');
  const [iLabel, setILabel] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!iTitle.trim()) return;
    setCreating(true);
    try {
      const description = serializeDescriptionAndMedia(iDesc, uploadedFiles);
      await onCreateIssue(iTitle.trim(), description, iPriority, iLabel);
      setITitle('');
      setIDesc('');
      setIPriority('medium');
      setILabel('');
      setUploadedFiles([]);
    } finally {
      setCreating(false);
    }
  };

  const handleDropUpload = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    triggerUpload('new_attachment');
  };

  return (
    <div className="it-detail-overlay" onClick={onClose}>
      <div className="it-detail-panel" onClick={e => e.stopPropagation()}>
        <div className="it-detail-header">
          <div className="it-detail-header-title">Create New Issue</div>
          <button className="it-icon-btn" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>
        
        <div className="it-detail-layout">
          <div className="it-detail-main">
            <div className="it-form-group">
              <label className="it-form-label">Issue Title</label>
              <input 
                className="it-form-input" 
                placeholder="e.g., [API] Support for batch processing endpoints" 
                value={iTitle} 
                onChange={e => setITitle(e.target.value)} 
                autoFocus 
              />
            </div>
            
            <div className="it-form-group">
              <label className="it-form-label">Description</label>
              <div className="it-comment-input-box" style={{ marginTop: 0 }}>
                <div className="it-comment-actions" style={{ borderTop: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 0, paddingBottom: 12, marginBottom: 12 }}>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="it-icon-btn"><b>B</b></button>
                      <button type="button" className="it-icon-btn"><i>I</i></button>
                      <button type="button" className="it-icon-btn">&lt;&gt;</button>
                      <button type="button" className="it-icon-btn">🔗</button>
                   </div>
                </div>
                <textarea 
                  className="it-comment-textarea" 
                  placeholder="Describe the issue, steps to reproduce, or expected behavior..." 
                  value={iDesc} 
                  onChange={e => setIDesc(e.target.value)} 
                  style={{ minHeight: 150 }}
                />
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
                              const group = uploadedFiles.map(m => ({
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
                            setUploadedFiles(prev => prev.map((item, i) => i === idx ? { ...item, note: val } : item));
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
                
                <div 
                  className="it-upload-box" 
                  onClick={() => triggerUpload('new_attachment')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropUpload}
                  style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 140 }}
                >
                  <span style={{ fontSize: 24, marginBottom: 4 }}>＋</span>
                  <span>
                    {uploading && uploadTarget === 'new_attachment' ? 'Uploading...' : 'Upload File'}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="it-btn it-btn-ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="it-btn it-btn-primary" onClick={handleSubmit} disabled={creating || !iTitle.trim()}>
                Create Issue 🚀
              </button>
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
              <div className="it-sidebar-box-title">Priority</div>
              <PrioritySelector value={iPriority} onChange={setIPriority} />
            </div>
            
            <div className="it-sidebar-box">
              <div className="it-sidebar-box-title">Assignee</div>
              <div className="it-assignee-box">
                <div className="it-issue-avatar">{currentUser?.id.slice(0, 2).toUpperCase() || 'U'}</div>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Assign to me</span>
              </div>
            </div>
            
            <div className="it-sidebar-box">
              <div className="it-sidebar-box-title">Labels</div>
              <LabelSelector value={iLabel} onChange={setILabel} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default NewIssuePanel;
