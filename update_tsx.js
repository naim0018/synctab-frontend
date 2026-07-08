const fs = require('fs');

let tsx = fs.readFileSync('src/components/IssueTracker.tsx', 'utf8');

// Replace kanban board mapping
tsx = tsx.replace(
  /\{columnIssues\.map\(issue => \(\s*<div key=\{issue\.id\}([\s\S]*?)<\/div>\s*\)\)\}/,
  `{columnIssues.map(issue => (
    <div key={issue.id} className={\`it-issue-card \${issue.status === 'done' || issue.status === 'closed' ? 'done' : ''}\`} onClick={() => setSelectedIssue(issue)}>
      <div className="it-issue-tags">
        <span className={\`it-badge it-priority-\${issue.priority}\`}>• {issue.priority}</span>
        {issue.label && <span className="it-badge it-label-badge">{issue.label}</span>}
      </div>
      <div className={\`it-issue-title \${issue.status === 'done' || issue.status === 'closed' ? 'done' : ''}\`}>
        {issue.title}
      </div>
      <div className="it-issue-footer">
        <span className="it-issue-id">ID-{issue.id.slice(-4).toUpperCase()}</span>
        <div className="it-issue-avatar">{issue.creatorId.slice(0, 2).toUpperCase()}</div>
      </div>
    </div>
  ))}`
);

// We need to change the detail view to use a 2-column layout
tsx = tsx.replace(
  /<div className="it-detail-overlay"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/,
  `{selectedIssue && (
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
                        {c.authorId === user?.id && <button className="it-icon-btn" style={{ marginLeft: 'auto', padding: 4 }} onClick={() => deleteComment(c.id)}>✕</button>}
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
                  <div className="it-sidebar-box-title">Priority</div>
                  <div className="it-issue-tags">
                    <span className={\`it-badge it-priority-\${selectedIssue.priority}\`}>• {selectedIssue.priority}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}`
);

// We need to change the new issue view to use the 2-column layout as well
tsx = tsx.replace(
  /\{showNewIssue && \([\s\S]*?\}\s*\)\}/,
  `{showNewIssue && (
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
      )}`
);

fs.writeFileSync('src/components/IssueTracker.tsx', tsx);
