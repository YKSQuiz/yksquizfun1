import React, { useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';

interface ProfileLevelCardProps {
  avatar: string;
  displayName: string;
  level: number;
  xp: number;
  xpToNext: number;
  rank: string;
}

// Animation constants
const ANIMATION_DURATIONS = {
  RANK_SPIN: 1200,
  AVATAR_BOUNCE: 900,
  FADE_IN: 300
} as const;

// Confetti configuration
const CONFETTI_CONFIG = {
  particleCount: 70,
  spread: 70,
  origin: { y: 0.5 },
  zIndex: 9999
} as const;

const ProfileLevelCard: React.FC<ProfileLevelCardProps> = React.memo(({ 
  avatar, 
  displayName, 
  level, 
  xp, 
  xpToNext, 
  rank 
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const prevLevel = useRef(level);
  const rankIconRef = useRef<HTMLSpanElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Memoized percentage calculation
  const percent = useMemo(() => 
    Math.min(100, Math.round((xpToNext > 0 ? (xp / (xp + xpToNext)) : 1) * 100)),
    [xp, xpToNext]
  );

  // Memoized XP display text
  const xpDisplayText = useMemo(() => 
    `${xp} / ${xp + xpToNext} XP`,
    [xp, xpToNext]
  );

  // Memoized XP to next text
  const xpToNextText = useMemo(() => 
    `Sonraki seviye için ${xpToNext} XP gerekli`,
    [xpToNext]
  );

  // Memoized level display text
  const levelDisplayText = useMemo(() => 
    `Seviye ${level}`,
    [level]
  );

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Update progress bar width
  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${percent}%`;
    }
  }, [percent]);

  // Level up animations and confetti
  useEffect(() => {
    if (level > prevLevel.current) {
      // Trigger confetti
      confetti(CONFETTI_CONFIG);
      
      // Rank icon spin animation
      if (rankIconRef.current) {
        rankIconRef.current.classList.add('rank-spin');
        setTimeout(() => {
          rankIconRef.current?.classList.remove('rank-spin');
        }, ANIMATION_DURATIONS.RANK_SPIN);
      }
      
      // Avatar bounce animation
      if (avatarRef.current) {
        avatarRef.current.classList.add('avatar-bounce');
        setTimeout(() => {
          avatarRef.current?.classList.remove('avatar-bounce');
        }, ANIMATION_DURATIONS.AVATAR_BOUNCE);
      }
    }
    prevLevel.current = level;
  }, [level]);

  return (
    <div ref={cardRef} className="profile-level-card">
      <div className="profile-avatar-wrapper" ref={avatarRef}>
        <div className="profile-avatar">{avatar}</div>
      </div>
      <div className="profile-info">
        <h2 className="profile-name">{displayName}</h2>
        <div className="profile-level">
          <span className="profile-level-badge">{levelDisplayText}</span>
          <span ref={rankIconRef} className="rank-icon">🏆</span>
          <span className="rank-name">{rank}</span>
        </div>
        <div className="xp-progress">
          <div className="xp-info">
            <span className="xp-text">{xpDisplayText}</span>
          </div>
          <div className="progress-bar">
            <div ref={barRef} className="progress-fill"></div>
          </div>
          <div className="xp-to-next">
            {xpToNextText}
          </div>
        </div>
      </div>
    </div>
  );
});

ProfileLevelCard.displayName = 'ProfileLevelCard';

export default ProfileLevelCard; 