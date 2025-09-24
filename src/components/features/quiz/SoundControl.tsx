import React, { useState, useRef, useEffect } from 'react';
import { useSoundManager } from '../../../hooks/useSoundManager';
import './SoundControl.css';

const SoundControl: React.FC = () => {
  const { isEnabled, toggleSound, playSound } = useSoundManager();

  const handleToggleSound = () => {
    toggleSound();
  };

  return (
    <div className="sound-control-container">
      {/* Ana ses butonu */}
      <button
        className={`sound-control-button ${isEnabled ? 'enabled' : 'disabled'}`}
        onClick={handleToggleSound}
        aria-label={isEnabled ? 'Sesi kapat' : 'Sesi aç'}
        title={isEnabled ? 'Sesi kapat' : 'Sesi aç'}
      >
        <span className="sound-icon">
          {isEnabled ? '🔊' : '🔇'}
        </span>
      </button>
    </div>
  );
};

export default SoundControl;
