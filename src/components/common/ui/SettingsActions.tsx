import React, { useCallback } from 'react';
import { FaEdit, FaSignOutAlt } from 'react-icons/fa';

interface SettingsActionsProps {
  onEditProfile?: () => void;
  onLogout: () => void;
}

const SettingsActions: React.FC<SettingsActionsProps> = ({ onEditProfile, onLogout }) => {
  const handleEditProfile = useCallback(() => {
    onEditProfile?.();
  }, [onEditProfile]);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  return (
    <div className="settings-actions-panel">
      <div className="settings-actions-btns">
        <button className="settings-btn" onClick={handleEditProfile}>
          <FaEdit className="settings-btn-icon" />
          Profil Düzenle
        </button>
        <button className="settings-btn settings-btn-logout" onClick={handleLogout}>
          <FaSignOutAlt className="settings-btn-icon" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default SettingsActions; 