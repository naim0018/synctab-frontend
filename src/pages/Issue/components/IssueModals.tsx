import React, { useState } from 'react';

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, icon: string, color: string) => void;
  loading: boolean;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  loading
}) => {
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pIcon, setPIcon] = useState('📁');
  const [pColor, setPColor] = useState(PROJECT_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!pName.trim()) return;
    onCreate(pName.trim(), pDesc.trim(), pIcon.trim(), pColor);
  };

  return (
    <div className="it-modal-overlay" onClick={onClose}>
      <div className="it-modal" onClick={e => e.stopPropagation()}>
        <div className="it-modal-header">
          <span className="it-modal-title">New Project</span>
          <button className="it-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="it-modal-body">
          <div className="it-form-group">
            <label className="it-form-label">Name</label>
            <input 
              className="it-form-input" 
              placeholder="Project name" 
              value={pName} 
              onChange={e => setPName(e.target.value)} 
              autoFocus 
            />
          </div>
          <div className="it-form-group">
            <label className="it-form-label">Description</label>
            <textarea 
              className="it-form-textarea" 
              placeholder="What is this project about?" 
              value={pDesc} 
              onChange={e => setPDesc(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="it-form-group" style={{ flex: 1 }}>
              <label className="it-form-label">Icon (emoji)</label>
              <input 
                className="it-form-input" 
                value={pIcon} 
                onChange={e => setPIcon(e.target.value)} 
                style={{ fontSize: 20, textAlign: 'center' }} 
              />
            </div>
            <div className="it-form-group" style={{ flex: 1.5 }}>
              <label className="it-form-label">Color</label>
              <div className="it-color-picker-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {PROJECT_COLORS.map(c => (
                  <div 
                    key={c} 
                    className={`it-color-swatch ${pColor === c ? 'selected' : ''}`} 
                    style={{ 
                      background: c, 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      cursor: 'pointer',
                      border: pColor === c ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: pColor === c ? '0 0 8px rgba(99,102,241,0.5)' : 'none'
                    }} 
                    onClick={() => setPColor(c)} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="it-modal-footer">
          <button className="it-btn it-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="it-btn it-btn-primary" onClick={handleSubmit} disabled={!pName.trim() || loading}>
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (token: string) => void;
}

export const JoinProjectModal: React.FC<JoinProjectModalProps> = ({
  isOpen,
  onClose,
  onJoin
}) => {
  const [joinToken, setJoinToken] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!joinToken.trim()) return;
    onJoin(joinToken.trim());
    setJoinToken('');
  };

  return (
    <div className="it-modal-overlay" onClick={onClose}>
      <div className="it-modal" onClick={e => e.stopPropagation()}>
        <div className="it-modal-header">
          <span className="it-modal-title">Join a Project</span>
          <button className="it-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="it-modal-body">
          <div className="it-form-group">
            <label className="it-form-label">Invite Token</label>
            <input 
              className="it-form-input" 
              placeholder="Paste invite token here" 
              value={joinToken} 
              onChange={e => setJoinToken(e.target.value)} 
              autoFocus 
            />
          </div>
        </div>
        <div className="it-modal-footer">
          <button className="it-btn it-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="it-btn it-btn-primary" onClick={handleSubmit} disabled={!joinToken.trim()}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

interface Project {
  id: string;
  name: string;
  inviteToken: string;
  members: { userId: string; role: string }[];
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onRegenerateToken: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  project,
  onRegenerateToken
}) => {
  if (!isOpen || !project) return null;

  return (
    <div className="it-modal-overlay" onClick={onClose}>
      <div className="it-modal" onClick={e => e.stopPropagation()}>
        <div className="it-modal-header">
          <span className="it-modal-title">Invite Teammates</span>
          <button className="it-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="it-modal-body">
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invite Token — share this with your teammates</div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all', userSelect: 'all' }}>{project.inviteToken}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                className="it-btn it-btn-ghost" 
                style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }} 
                onClick={() => navigator.clipboard.writeText(project.inviteToken)}
              >
                📋 Copy
              </button>
              <button 
                className="it-btn it-btn-ghost" 
                style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }} 
                onClick={onRegenerateToken}
              >
                🔄 Regenerate
              </button>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Members: <strong style={{ color: '#fff' }}>{project.members?.length ?? 1}</strong>
          </div>
        </div>
        <div className="it-modal-footer">
          <button className="it-btn it-btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
