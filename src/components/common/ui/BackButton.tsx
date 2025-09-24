import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './BackButton.css';

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  className = '', 
  onClick
}) => {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  }, [onClick, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Optimized ripple effect
  const createRipple = useCallback((e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLButtonElement;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    createRipple(e);
    handleClick();
  }, [createRipple, handleClick]);

  return (
    <button
      ref={buttonRef}
      className={`back-button ${className} ${isHovered ? 'hovered' : ''} ${isPressed ? 'pressed' : ''}`}
      onClick={handleButtonClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      aria-label="Geri dön"
      title="Geri dön"
    >
      <div className="button-glow"></div>
      
      <div className="button-container">
        <div className="icon-container">
          <div className="icon-background">
            <svg 
              className="back-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </div>
          <div className="icon-glow"></div>
        </div>
      </div>
      
      <div className="button-border"></div>
      
      <div className="particles">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="particle" style={{ '--i': i } as React.CSSProperties}></div>
        ))}
      </div>
    </button>
  );
};

export default BackButton; 