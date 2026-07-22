import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProjectSidebar from './components/ProjectSidebar';
import IssueBoard from './components/IssueBoard';
import IssueDetailPane from './components/IssueDetailPane';
import NewIssuePanel from './components/NewIssuePanel';
import AttachmentPreview from './components/AttachmentPreview';
import { 
  NewProjectModal, 
  JoinProjectModal, 
  InviteModal 
} from './components/IssueModals';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
import './IssuePage.css';

interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  ownerId: string;
  inviteToken: string;
  members: { userId: string; role: string }[];
  _count: {
    issues: number;
  };
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
  _count?: {
    comments: number;
  };
}

interface Comment {
  id: string;
  text: string;
  issueId: string;
  authorId: string;
  createdAt: string;
}

export const IssuePage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem('synctab_user');
      if (s) {
        setCurrentUser(JSON.parse(s));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentFiles, setCommentFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; note?: string }>>([]);
  const [editMedia, setEditMedia] = useState<Array<{ name: string; url: string; note?: string }>>([]);

  const [previewGroup, setPreviewGroup] = useState<Array<{ isImage: boolean; name: string; url: string }>>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  // Modals Visibility
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

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
      // In details pane, we directly append to editMedia
      setEditMedia(prev => [...prev, { name: file.name, url, note: '' }]);
    }

    e.target.value = '';
    setUploadTarget(null);
  };

  const loadProjects = useCallback(async () => {
    if (!currentUser?.id) return;
    const r = await fetch(`${API}/issue-projects?userId=${currentUser.id}`);
    if (r.ok) { 
      const d = await r.json(); 
      setProjects(Array.isArray(d.data) ? d.data : d); 
    }
  }, [currentUser?.id]);

  const loadIssues = useCallback(async (projectId: string) => {
    const r = await fetch(`${API}/issues?projectId=${projectId}`);
    if (r.ok) { 
      const d = await r.json(); 
      setIssues(Array.isArray(d.data) ? d.data : d); 
    }
  }, []);

  const loadComments = useCallback(async (issueId: string) => {
    const r = await fetch(`${API}/issues/${issueId}/comments`);
    if (r.ok) { 
      const d = await r.json(); 
      setComments(Array.isArray(d.data) ? d.data : d); 
    }
  }, []);

  useEffect(() => { 
    if (currentUser?.id) {
      loadProjects(); 
    }
  }, [currentUser?.id, loadProjects]);

  useEffect(() => { 
    if (selectedProjectId) {
      loadIssues(selectedProjectId); 
    } else {
      setIssues([]); 
    }
  }, [selectedProjectId, loadIssues]);

  useEffect(() => { 
    if (selectedIssue) {
      loadComments(selectedIssue.id); 
    }
  }, [selectedIssue?.id, loadComments]);

  const handleCreateProject = async (name: string, description: string, icon: string, color: string) => {
    if (!currentUser?.id) return;
    const r = await fetch(`${API}/issue-projects`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        name, 
        description, 
        icon, 
        color, 
        ownerId: currentUser.id 
      }) 
    });
    if (r.ok) { 
      await loadProjects(); 
      setShowNewProject(false); 
    }
  };

  const handleCreateIssue = async (
    title: string, 
    description: string, 
    priority: string, 
    label: string
  ) => {
    if (!selectedProjectId || !currentUser?.id) return;
    const r = await fetch(`${API}/issues`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        title, 
        description, 
        priority, 
        label, 
        projectId: selectedProjectId, 
        creatorId: currentUser.id
      }) 
    });
    if (r.ok) { 
      await loadIssues(selectedProjectId); 
      setShowNewIssue(false); 
    }
  };

  const handleSaveIssueDetails = async (updatedFields: { 
    title: string; 
    description: string; 
    status: string; 
    priority: string; 
    label: string; 
  }) => {
    if (!selectedIssue || !selectedProjectId) return;
    const r = await fetch(`${API}/issues/${selectedIssue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    });
    if (r.ok) {
      await loadIssues(selectedProjectId);
      setSelectedIssue(null);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    await fetch(`${API}/issues/${id}`, { method: 'DELETE' });
    setIssues(prev => prev.filter(i => i.id !== id));
    if (selectedIssue?.id === id) {
      setSelectedIssue(null);
    }
    if (selectedProjectId) {
      loadProjects();
    }
  };

  const handleAddComment = async (text: string, files: Array<{ name: string; url: string }>) => {
    if (!selectedIssue || !currentUser?.id) return;
    let bodyText = text;
    if (files.length > 0) {
      const attachmentsText = files.map(file => {
        const isImg = file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || file.url.startsWith('data:image/');
        return isImg ? `![${file.name}](${file.url})` : `[${file.name}](${file.url})`;
      }).join('\n');
      bodyText += '\n\n' + attachmentsText;
    }
    const r = await fetch(`${API}/issues/${selectedIssue.id}/comments`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ text: bodyText, authorId: currentUser.id }) 
    });
    if (r.ok) { 
      loadComments(selectedIssue.id); 
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    await fetch(`${API}/issue-comments/${id}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleEditComment = async (commentId: string, text: string) => {
    const r = await fetch(`${API}/issue-comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (r.ok) {
      if (selectedIssue) {
        loadComments(selectedIssue.id);
      }
    }
  };

  const handleJoinProject = async (token: string) => {
    if (!currentUser?.id) return;
    const r = await fetch(`${API}/issue-projects/join`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ token, userId: currentUser.id }) 
    });
    if (r.ok) { 
      await loadProjects(); 
      setShowJoin(false); 
    }
  };

  const handleRegenerateToken = async () => {
    if (!selectedProject) return;
    const r = await fetch(`${API}/issue-projects/${selectedProject.id}/regenerate-token`, { method: 'POST' });
    if (r.ok) { 
      loadProjects(); 
    }
  };

  const filteredIssues = issues.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleIssueClick = async (issue: Issue) => {
    const r = await fetch(`${API}/issues/${issue.id}`);
    if (r.ok) {
      const d = await r.json();
      setSelectedIssue(d.data || d);
    } else {
      setSelectedIssue(issue);
    }
  };

  return (
    <div className="it-root">
      {/* Project Sidebar */}
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onNewProjectClick={() => setShowNewProject(true)}
        onJoinClick={() => setShowJoin(true)}
      />

      {/* Main Kanban Board */}
      <IssueBoard
        selectedProject={selectedProject}
        filteredIssues={filteredIssues}
        search={search}
        setSearch={setSearch}
        onNewProjectClick={() => setShowNewProject(true)}
        onJoinClick={() => setShowJoin(true)}
        onInviteClick={() => setShowInvite(true)}
        onNewIssueClick={() => setShowNewIssue(true)}
        onIssueClick={handleIssueClick}
      />

      {/* Details pane overlay */}
      {selectedIssue && (
        <IssueDetailPane
          selectedIssue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onSaveIssue={handleSaveIssueDetails}
          onDeleteIssue={handleDeleteIssue}
          comments={comments}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          triggerUpload={triggerUpload}
          uploading={uploading}
          uploadTarget={uploadTarget}
          commentFiles={commentFiles}
          setCommentFiles={setCommentFiles}
          onPreview={(group, index) => {
            setPreviewGroup(group);
            setPreviewIndex(index);
          }}
          selectedProjectName={selectedProject?.name || ''}
          currentUser={currentUser}
          editMedia={editMedia}
          setEditMedia={setEditMedia}
        />
      )}

      {/* New Issue Panel */}
      <NewIssuePanel
        isOpen={showNewIssue}
        onClose={() => setShowNewIssue(false)}
        selectedProjectName={selectedProject?.name || ''}
        currentUser={currentUser}
        onCreateIssue={handleCreateIssue}
        triggerUpload={triggerUpload}
        uploading={uploading}
        uploadTarget={uploadTarget}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        onPreview={(group, index) => {
          setPreviewGroup(group);
          setPreviewIndex(index);
        }}
      />

      {/* Modals */}
      <NewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
        loading={uploading}
      />

      <JoinProjectModal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={handleJoinProject}
      />

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        project={selectedProject}
        onRegenerateToken={handleRegenerateToken}
      />

      {/* Preview overlay */}
      <AttachmentPreview
        previewGroup={previewGroup}
        previewIndex={previewIndex}
        setPreviewIndex={setPreviewIndex}
        onClose={() => {
          setPreviewGroup([]);
          setPreviewIndex(-1);
        }}
      />

      {/* Hidden file uploader input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />
    </div>
  );
};

export default IssuePage;
