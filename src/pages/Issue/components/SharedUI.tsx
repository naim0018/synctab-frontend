import React from 'react';

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

export const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

export const fmtDate = (d: string | undefined | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
};

interface PrioritySelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({ value, onChange }) => {
  const priorities = [
    { value: 'critical', label: 'Urgent', color: '#ff4b4b' },
    { value: 'high', label: 'High', color: '#fb923c' },
    { value: 'medium', label: 'Normal', color: '#e2e8f0' },
    { value: 'low', label: 'Low', color: '#64748b' }
  ];

  return (
    <div className="it-priority-grid">
      {priorities.map(p => {
        const isSelected = value === p.value;
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

interface LabelSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({ value, onChange }) => {
  const labels = [
    { value: 'bug', label: 'Bug', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    { value: 'feature', label: 'Feature', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
    { value: 'enhancement', label: 'Enhancement', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    { value: 'question', label: 'Question', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
    { value: 'docs', label: 'Docs', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { value: 'design', label: 'Design', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' }
  ];

  return (
    <div className="it-labels-selector">
      {labels.map(l => {
        const isSelected = value === l.value;
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
