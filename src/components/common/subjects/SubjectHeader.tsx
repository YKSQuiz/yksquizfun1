import React, { useMemo } from 'react';

interface SubjectHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

const SubjectHeader: React.FC<SubjectHeaderProps> = ({
  title,
  subtitle,
  icon
}) => {
  const iconElement = useMemo(() => 
    icon ? <div className="subject-header-icon">{icon}</div> : null
  , [icon]);

  const subtitleElement = useMemo(() => 
    subtitle ? <p className="subject-header-subtitle">{subtitle}</p> : null
  , [subtitle]);

  return (
    <div className="subject-header">
      <div className="subject-header-content">
        {iconElement}
        <div className="subject-header-text">
          <h1 className="subject-header-title">{title}</h1>
          {subtitleElement}
        </div>
      </div>
    </div>
  );
};

export default SubjectHeader; 