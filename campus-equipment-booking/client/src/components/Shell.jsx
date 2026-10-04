import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

export default function Shell({ tabs, activeTab, onTabChange, children, badges = {} }) {
  const { user, logout, updateUser } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    department: user.department || '',
    phone: user.phone || '',
  });
  const profileName = user.name || user.email;
  const initials = profileName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function startEditingProfile() {
    setProfileForm({
      name: user.name || '',
      department: user.department || '',
      phone: user.phone || '',
    });
    setProfileError('');
    setEditingProfile(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    try {
      const response = await api.patch('/users/me', profileForm);
      updateUser(response.data);
      setEditingProfile(false);
    } catch (error) {
      setProfileError(error.response?.data?.error || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand-mini">
          <span className="display">CourtSide</span>
          <span className="role-pill">{user.role}</span>
        </div>
        <div className="user-block">
          <details className="profile-menu">
            <summary className="profile-trigger" aria-label="Open profile menu">
              <span className="profile-avatar" aria-hidden="true">{initials}</span>
              <span className="profile-trigger-copy">
                <span className="profile-trigger-name">{profileName}</span>
                <span className="profile-trigger-role">{user.role}</span>
              </span>
            </summary>
            <div className="profile-panel">
              {editingProfile ? (
                <form className="profile-edit-form" onSubmit={saveProfile}>
                  <label htmlFor="profile-name">Name</label>
                  <input
                    id="profile-name"
                    className="input"
                    value={profileForm.name}
                    maxLength={120}
                    onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                    required
                  />
                  <label htmlFor="profile-department">Department</label>
                  <input
                    id="profile-department"
                    className="input"
                    value={profileForm.department}
                    maxLength={120}
                    onChange={(event) => setProfileForm({ ...profileForm, department: event.target.value })}
                  />
                  <label htmlFor="profile-phone">Phone</label>
                  <input
                    id="profile-phone"
                    className="input"
                    value={profileForm.phone}
                    maxLength={20}
                    onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                  />
                  {profileError && <div className="error-banner" role="alert">{profileError}</div>}
                  <div className="profile-edit-actions">
                    <button className="profile-cancel" type="button" onClick={() => setEditingProfile(false)}>Cancel</button>
                    <button className="profile-save" type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="profile-panel-name">{profileName}</div>
                  <div className="profile-panel-email">{user.email}</div>
                  <div className="profile-panel-role">{user.role}</div>
                  <div className="profile-panel-detail">
                    <span>Department</span>
                    <strong>{user.department || 'Not set'}</strong>
                  </div>
                  <div className="profile-panel-detail">
                    <span>Phone</span>
                    <strong>{user.phone || 'Not set'}</strong>
                  </div>
                  <button className="profile-edit" onClick={startEditingProfile}>Edit profile</button>
                  <button className="profile-logout" onClick={logout}>Log out</button>
                </>
              )}
            </div>
          </details>
        </div>
      </div>
      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            {label}
            {badges[key] > 0 && <span className="badge-count">{badges[key]}</span>}
          </button>
        ))}
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
