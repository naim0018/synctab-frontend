import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CustomConfirmModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

export const CustomConfirmModal: React.FC<CustomConfirmModalProps> = ({
  isOpen,
  type,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  onConfirm,
  onCancel
}) => {
  const [modalInputVal, setModalInputVal] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setModalInputVal(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="bm-custom-modal-backdrop" onClick={onCancel}>
      <div className="bm-custom-modal-card" onClick={e => e.stopPropagation()}>
        <div className="bm-custom-modal-header">
          <span className="bm-custom-modal-title">{title}</span>
          <button 
            className="bm-custom-modal-close" 
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="bm-custom-modal-body">
          <div>{message}</div>
          {type === 'prompt' && (
            <input 
              type="text" 
              value={modalInputVal} 
              onChange={e => setModalInputVal(e.target.value)}
              className="bm-custom-modal-input"
              placeholder={placeholder}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onConfirm(modalInputVal);
                if (e.key === 'Escape') onCancel();
              }}
            />
          )}
        </div>

        <div className="bm-custom-modal-footer">
          {type !== 'alert' && (
            <button 
              className="bm-mgr-btn" 
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button 
            className="bm-mgr-btn bm-mgr-btn-primary" 
            onClick={() => onConfirm(type === 'prompt' ? modalInputVal : undefined)}
          >
            {type === 'alert' ? 'OK' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CustomConfirmModal;
