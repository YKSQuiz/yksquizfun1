import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { altKonularConfigNew as altKonularConfig } from '../../../data/subjects';
import { AltKonu } from '../../../data/subjects/types';
import { GradientBackground, BackButton } from '../ui';
import './subjects.css';
import SubjectHeader from './SubjectHeader';

interface AltKonuSelectorProps {
  subjectId: string;
  subjectName: string;
}

const AltKonuSelector: React.FC<AltKonuSelectorProps> = ({ subjectId, subjectName }) => {
  const navigate = useNavigate();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  // Mobil cihaz tespiti
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);
  
  const altKonular = altKonularConfig[subjectId];
  
  if (!altKonular || altKonular.length === 0) {
    return (
      <GradientBackground variant="subjects" showParticles={!isMobile} particleCount={isMobile ? 0 : 10}>
        <div className="alt-konu-container">
          <div className="alt-konu-header">
            <h1 className="alt-konu-title">{subjectName}</h1>
            <p className="alt-konu-subtitle">
              📚 Bu ders için henüz alt konular eklenmemiş. Yakında bu dersin alt konuları eklenecek!
            </p>
          </div>
        </div>
      </GradientBackground>
    );
  }

  const handleAltKonuClick = async (altKonu: AltKonu) => {
    if (loadingStates[altKonu.id]) return;
    
    setLoadingStates(prev => ({ ...prev, [altKonu.id]: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate(altKonu.route);
    } finally {
      setLoadingStates(prev => ({ ...prev, [altKonu.id]: false }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, altKonu: AltKonu) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAltKonuClick(altKonu);
    }
  };

  return (
    <GradientBackground variant="subjects" showParticles={!isMobile} particleCount={isMobile ? 0 : 10}>
      <BackButton />
      <div className="alt-konu-container">
        <SubjectHeader 
          title={subjectName}
          subtitle="Alt konuları seçerek başlayabilirsin"
        />
        
        <div className="alt-konu-grid">
          {altKonular.map((altKonu: AltKonu, index: number) => {
            const isLoading = loadingStates[altKonu.id];
            
            return (
              <div
                key={altKonu.id}
                className={`alt-konu-card ${isLoading ? 'loading' : ''}`}
                onClick={() => handleAltKonuClick(altKonu)}
                style={{
                  background: altKonu.color,
                  animation: isMobile ? 'none' : `popIn 0.5s cubic-bezier(0.39, 0.575, 0.56, 1) ${(index * 0.09).toFixed(2)}s both`
                }}
                tabIndex={isLoading ? -1 : 0}
                onKeyDown={(e) => handleKeyDown(e, altKonu)}
                role="button"
                aria-label={`${altKonu.label} alt konusunu seç`}
                aria-disabled={isLoading}
              >
                <div className="alt-konu-icon">
                  {altKonu.icon}
                </div>
                <span className="alt-konu-label">
                  {altKonu.label}
                </span>
                <span className="alt-konu-shine" />
              </div>
            );
          })}
        </div>
      </div>
    </GradientBackground>
  );
};

export default AltKonuSelector; 