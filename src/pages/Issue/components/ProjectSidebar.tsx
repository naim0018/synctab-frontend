import React from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  ownerId: string;
  inviteToken: string;
  _count: {
    issues: number;
  };
}

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProjectClick: () => void;
  onJoinClick: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onNewProjectClick,
  onJoinClick
}) => {
  return (
    <div className="it-sidebar">
      <div className="it-sidebar-header">
        <span className="it-sidebar-title">Projects</span>
        <button 
          className="it-sidebar-new-btn" 
          onClick={onNewProjectClick} 
          title="New Project"
        >
          ＋
        </button>
      </div>
      
      <div className="it-sidebar-projects">
        {projects.map(p => (
          <div 
            key={p.id} 
            className={`it-project-item ${selectedProjectId === p.id ? 'active' : ''}`} 
            onClick={() => onSelectProject(p.id)}
          >
            <div className="it-project-dot" style={{ background: p.color }} />
            <span style={{ fontSize: 15 }}>{p.icon}</span>
            <span className="it-project-name">{p.name}</span>
            <span className="it-project-count">{p._count?.issues ?? 0}</span>
          </div>
        ))}
        {projects.length === 0 && (
          <div style={{ padding: '12px 8px', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            No projects yet
          </div>
        )}
      </div>

      <div className="it-sidebar-join">
        <button className="it-sidebar-join-btn" onClick={onJoinClick}>
          🔗 Join via invite link
        </button>
      </div>
    </div>
  );
};
export default ProjectSidebar;
