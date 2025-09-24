import React, { useEffect, useState, useMemo } from 'react';
import './GradientBackground.css';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'purple-blue' | 'blue-purple' | 'green-blue' | 'orange-red' | 'home' | 'subjects' | 'auth' | 'quiz' | 'market' | 'stats' | 'admin' | 'test';
  showParticles?: boolean;
  particleCount?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Particle {
  id: number;
  left: string;
  delay: number;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'default',
  showParticles = true,
  particleCount = 5,
  className = '',
  style = {}
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Mobile detection for performance optimization
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const containerClasses = useMemo(() => [
    'gradient-background',
    `gradient-background-${variant}`,
    className
  ].filter(Boolean).join(' '), [variant, className]);

  const generatedParticles = useMemo(() => {
    if (!showParticles || isMobile) return []; // Disable particles on mobile
    
    return Array.from({ length: particleCount }, (_, index) => ({
      id: index,
      left: `${(index + 1) * 20}%`,
      delay: index * 2
    }));
  }, [showParticles, particleCount, isMobile]);

  useEffect(() => {
    setParticles(generatedParticles);
  }, [generatedParticles]);

  return (
    <div className={containerClasses} style={style}>
      {/* Ana gradient arka plan */}
      <div className="gradient-bg-base" />
      
      {/* Particle efektleri */}
      {showParticles && particles.length > 0 && (
        <div className="particle-background">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: particle.left,
                animationDelay: `${particle.delay}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Geometric şekiller */}
      <div className="geometric-shapes">
        <div className="geometric-shape shape-1" />
        <div className="geometric-shape shape-2" />
        <div className="geometric-shape shape-3" />
      </div>
      
      {/* İçerik */}
      <div className="gradient-content">
        {children}
      </div>
    </div>
  );
};

export default GradientBackground; 