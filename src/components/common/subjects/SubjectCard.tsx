import React, { useState, useCallback, useMemo } from 'react';
import { AutoResizeText } from '../ui';

interface SubjectCardProps {
  label: string;
  icon: string;
  color: string;
  onClick: () => void;
  index: number;
  isAltKonu?: boolean;
  disabled?: boolean;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  label,
  icon,
  color,
  onClick,
  index,
  isAltKonu = false,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const animationDelay = useMemo(() => (index * 0.09).toFixed(2), [index]);
  
  // Mobil cihaz tespiti
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const isDisabled = disabled || isLoading;
  const cardClassName = `subject-card ${isLoading ? 'loading' : ''} ${disabled ? 'disabled' : ''}`;
  const iconClassName = `subject-icon ${isAltKonu ? 'alt-konu' : ''}`;

  return (
    <div
      className={cardClassName}
      onClick={handleClick}
      style={{
        background: color,
        animation: isMobile ? 'none' : `popIn 0.5s cubic-bezier(0.39, 0.575, 0.56, 1) ${animationDelay}s both`
      }}
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label={`${label} dersini seç`}
      aria-disabled={isDisabled}
    >
      <div className={iconClassName}>
        {icon}
      </div>
      
      {isAltKonu ? (
        <AutoResizeText text={label} />
      ) : (
        <span className="subject-label">
          {label}
        </span>
      )}
      
      <span className="subject-shine" />
    </div>
  );
};

export default SubjectCard; 