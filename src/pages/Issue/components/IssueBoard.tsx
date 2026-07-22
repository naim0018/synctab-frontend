import React from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  ownerId: string;
  inviteToken: string;
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

interface IssueBoardProps {
  selectedProject: Project | null;
  filteredIssues: Issue[];
  search: string;
  setSearch: (val: string) => void;
  onNewProjectClick: () => void;
  onJoinClick: () => void;
  onInviteClick: () => void;
  onNewIssueClick: () => void;
  onIssueClick: (issue: Issue) => void | Promise<void>;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <div className="it-kanban-status-dot" style={{ backgroundColor: '#818cf8', boxShadow: '0 0 8px rgba(129,140,248,0.5)' }} />,
  in_progress: <div className="it-kanban-status-dot" style={{ backgroundColor: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />,
  done: <div className="it-kanban-status-dot" style={{ backgroundColor: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />,
  closed: <div className="it-kanban-status-dot" style={{ backgroundColor: '#6b7280' }} />,
};

export const IssueBoard: React.FC<IssueBoardProps> = ({
  selectedProject,
  filteredIssues,
  search,
  setSearch,
  onNewProjectClick,
  onJoinClick,
  onInviteClick,
  onNewIssueClick,
  onIssueClick
}) => {
  const parseDescriptionAndMedia = (descStr: string) => {
    let text = descStr;
    const media: string[] = [];
    try {
      const parsed = JSON.parse(descStr);
      if (parsed && typeof parsed === 'object') {
        text = parsed.text || '';
        if (Array.isArray(parsed.media)) {
          media.push(...parsed.media);
        }
      }
    } catch {
      // Fallback: description is plain text
    }
    return { text, media };
  };

  if (!selectedProject) {
    return (
      <div className="it-main">
        <div className="it-no-project">
          <div className="it-no-project-icon">🗂️</div>
          <div className="it-no-project-title">Select or create a project</div>
          <div className="it-no-project-sub">Track and resolve issues with your team</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="it-btn it-btn-primary" onClick={onNewProjectClick}>＋ New Project</button>
            <button className="it-btn it-btn-ghost" onClick={onJoinClick}>🔗 Join Project</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="it-main">
      {/* Header */}
      <div className="it-header">
        <div className="it-header-icon">{selectedProject.icon}</div>
        <div className="it-header-info">
          <div className="it-header-name">{selectedProject.name}</div>
          {selectedProject.description && <div className="it-header-desc">{selectedProject.description}</div>}
        </div>
        <div className="it-header-actions">
          <button className="it-btn it-btn-ghost" onClick={onInviteClick}>🔗 Invite</button>
          <button className="it-btn it-btn-primary" onClick={onNewIssueClick}>＋ New Issue</button>
        </div>
      </div>

      {/* Filters */}
      <div className="it-filters">
        <input 
          className="it-search" 
          placeholder="Search issues…" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* Kanban Board */}
      <div className="it-kanban">
        {['open', 'in_progress', 'done', 'closed'].map(statusKey => {
          const columnIssues = filteredIssues.filter(i => i.status === statusKey);
          const title = statusKey === 'open' ? 'Open' : statusKey === 'in_progress' ? 'In Progress' : statusKey === 'done' ? 'Done' : 'Closed';
          
          return (
            <div key={statusKey} className="it-kanban-column">
              <div className="it-kanban-header">
                <div className="it-kanban-title">
                  {STATUS_ICONS[statusKey] ?? STATUS_ICONS.open}
                  <span>{title}</span>
                </div>
                <span className="it-kanban-count">{columnIssues.length}</span>
              </div>
              <div className="it-kanban-body">
                {columnIssues.map(issue => {
                  const { media: cardMedia } = parseDescriptionAndMedia(issue.description);
                  const isDoneOrClosed = issue.status === 'done' || issue.status === 'closed';
                  
                  return (
                    <div 
                      key={issue.id} 
                      className={`it-issue-card ${isDoneOrClosed ? 'done' : ''}`} 
                      onClick={() => onIssueClick(issue)}
                    >
                      <div className="it-issue-tags">
                        <span className={`it-badge it-priority-${issue.priority}`}>
                          • {issue.priority}
                        </span>
                        {issue.label && (
                          <span className="it-badge it-label-badge">
                            {issue.label}
                          </span>
                        )}
                      </div>
                      <div className={`it-issue-title ${isDoneOrClosed ? 'done' : ''}`}>
                        {issue.title}
                      </div>
                      <div className="it-issue-footer">
                        <span className="it-issue-id">ID-{issue.id.slice(0, 4).toUpperCase()}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {cardMedia.length > 0 && (
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginRight: '4px' }}>
                              📎 {cardMedia.length}
                            </span>
                          )}
                          <div className="it-issue-avatar">
                            {issue.creatorId.slice(0, 2).toUpperCase()}
                          </div>
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
    </div>
  );
};
export default IssueBoard;
