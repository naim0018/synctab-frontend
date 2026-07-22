import React, { useState, useEffect, useRef } from 'react';
import { Edit2, LogOut } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import type { User } from '../../types';

interface ProfileDropdownProps {
  currentUser: User;
  handleStatusChange: (status: string) => Promise<void>;
  handleLogout: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  currentUser,
  handleStatusChange,
  handleLogout
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside profile dropdown handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        const trigger = document.querySelector('.widget-profile-btn');
        if (trigger && trigger.contains(event.target as Node)) {
          return;
        }
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" style={{ display: 'inline-block' }}>
      {/* User Profile Avatar with dropdown trigger */}
      <button 
        className="widget-circle-btn widget-profile-btn" 
        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        style={{ position: 'relative', padding: 0, overflow: 'visible', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <AvatarDisplay avatar={currentUser.avatar} name={currentUser.name} size={36} />
          <span className={`widget-status-dot ${currentUser.status.toLowerCase().replace(' ', '')}`} />
        </div>
      </button>

      {/* Profile Settings Dropdown popover - Google Apps Launcher style */}
      {showProfileDropdown && (
        <div className="profile-dropdown" style={{ position: 'absolute', top: '56px', right: '0px', width: '320px' }} ref={profileDropdownRef}>
          <div className="profile-dropdown-header">
            <span className="profile-dropdown-title">Google Apps</span>
            <button className="profile-dropdown-edit-btn" title="Google Settings" onClick={() => {
              window.open('https://myaccount.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <Edit2 size={14} />
            </button>
          </div>

          <div className="profile-launcher-grid">
            {/* Account */}
            <div className="launcher-item" onClick={() => {
              window.open('https://myaccount.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle" style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)' }}>
                <AvatarDisplay avatar={currentUser.avatar} name={currentUser.name} size={38} />
              </div>
              <span className="launcher-label">Account</span>
            </div>

            {/* Gmail */}
            <div className="launcher-item" onClick={() => {
              window.open('https://mail.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Gmail</span>
            </div>

            {/* Search */}
            <div className="launcher-item" onClick={() => {
              window.open('https://www.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Search" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Search</span>
            </div>

            {/* Maps */}
            <div className="launcher-item" onClick={() => {
              window.open('https://maps.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Google_Maps_icon_%282020%29.svg" alt="Maps" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Maps</span>
            </div>

            {/* Contacts */}
            <div className="launcher-item" onClick={() => {
              window.open('https://contacts.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon_%282020%29.svg" alt="Contacts" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Contacts</span>
            </div>

            {/* Calendar */}
            <div className="launcher-item" onClick={() => {
              window.open('https://calendar.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Calendar" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Calendar</span>
            </div>

            {/* Drive */}
            <div className="launcher-item" onClick={() => {
              window.open('https://drive.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Drive</span>
            </div>

            {/* Translate */}
            <div className="launcher-item" onClick={() => {
              window.open('https://translate.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Google_Translate_logo.svg" alt="Translate" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Translate</span>
            </div>

            {/* Photos */}
            <div className="launcher-item" onClick={() => {
              window.open('https://photos.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Photos_icon_%282020%29.svg" alt="Photos" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Photos</span>
            </div>

            {/* Gemini */}
            <div className="launcher-item" onClick={() => {
              window.open('https://gemini.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Gemini" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Gemini</span>
            </div>

            {/* News */}
            <div className="launcher-item" onClick={() => {
              window.open('https://news.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_News_icon_%282020%29.svg" alt="News" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">News</span>
            </div>

            {/* Meet */}
            <div className="launcher-item" onClick={() => {
              window.open('https://meet.google.com', '_blank', 'noopener,noreferrer');
              setShowProfileDropdown(false);
            }}>
              <div className="launcher-icon-circle bg-dark-glass">
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg" alt="Meet" className="launcher-icon-img" />
              </div>
              <span className="launcher-label">Meet</span>
            </div>
          </div>

          {/* Account Status & Sign Out */}
          <div className="profile-dropdown-footer" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '12px',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Active', 'Away', 'Meeting', 'Busy'].map((st) => {
                  const dotClass = st.toLowerCase();
                  const isSelected = currentUser.status.toLowerCase().includes(st.toLowerCase());
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        handleStatusChange(st);
                        setShowProfileDropdown(false);
                      }}
                      title={st}
                      style={{
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                        border: isSelected ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <span className={`status-dot ${dotClass}`} style={{ position: 'relative', border: 'none', bottom: 'auto', right: 'auto', transform: 'scale(1.2)' }} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email || 'Offline Session'}</span>
              </div>
              <button
                onClick={() => { handleLogout(); setShowProfileDropdown(false); }}
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  color: 'var(--color-meeting)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProfileDropdown;
