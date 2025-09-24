import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SubjectGrid from './SubjectGrid';
import { subjectsConfig, Subject } from '../../../data/subjects';

interface SubjectSelectorProps {
  category: 'tyt' | 'ayt-sayisal' | 'ayt-ea' | 'ayt-sozel';
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({ category }) => {
  const navigate = useNavigate();
  
  const configKey = useMemo(() => {
    const categoryMap: Record<string, string> = {
      'ayt-sayisal': 'aytSayisal',
      'ayt-ea': 'aytEa',
      'ayt-sozel': 'aytSozel',
      'tyt': 'tyt'
    };
    return categoryMap[category] || 'tyt';
  }, [category]);
  
  const config = useMemo(() => subjectsConfig[configKey], [configKey]);

  const handleSubjectClick = useCallback((subject: Subject) => {
    navigate(subject.route);
  }, [navigate]);
  
  if (!config) {
    return (
      <div className="error-container">
        <h2>Kategori bulunamadı: {category}</h2>
      </div>
    );
  }

  return (
    <SubjectGrid
      subjects={config.subjects}
      onSubjectClick={handleSubjectClick}
      title={config.subtitle}
      subtitle={config.subtitle}
    />
  );
};

export default SubjectSelector; 