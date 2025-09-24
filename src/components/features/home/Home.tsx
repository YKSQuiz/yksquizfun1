import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { SettingsActions, GradientBackground } from '../../../components/common/ui';
import { updateUserEnergy } from '../../../services/firebase';
import StreakCard from './StreakCard';
// Leaderboard import'u kaldırıldı - artık ayrı sayfa olacak
import './home.css';
import ReferralModal from '../referral/ReferralModal'; // Modal'ı import et
import DOMPurify from 'dompurify'; // ✅ GÜVENLİK: XSS koruması için

interface CategoryCard {
  id: string;
  className: string;
  icon: string;
  title: string;
  subtitle: string;
  route: string;
  hasEnterKey?: boolean;
}

const Home: React.FC = React.memo(() => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelModalData, setLevelModalData] = useState<any>(null);
  const [energyTimer, setEnergyTimer] = useState<NodeJS.Timeout | null>(null);
  const [regenCountdown, setRegenCountdown] = useState<number>(0);
  const [justRegenerated, setJustRegenerated] = useState(false);
  const userRef = useRef(user);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state'i

  // Mobile detection for performance optimization
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Memoized category cards configuration
  const categoryCards: CategoryCard[] = useMemo(() => [
    {
      id: 'tyt',
      className: 'tyt',
      icon: '📝',
      title: 'TYT',
      subtitle: 'Temel Yeterlilik<br />Testi',
      route: '/tyt-subjects',
      hasEnterKey: true
    },
    {
      id: 'ayt-ea',
      className: 'ayt-ea',
      icon: '⚖️',
      title: 'AYT',
      subtitle: 'Eşit Ağırlık',
      route: '/ayt-ea-subjects',
      hasEnterKey: true
    },
    {
      id: 'ayt-say',
      className: 'ayt-say',
      icon: '🧮',
      title: 'AYT',
      subtitle: 'Sayısal',
      route: '/ayt-say-subjects',
      hasEnterKey: true
    },
    {
      id: 'ayt-soz',
      className: 'ayt-soz',
      icon: '📖',
      title: 'AYT',
      subtitle: 'Sözel',
      route: '/ayt-soz-subjects',
      hasEnterKey: true
    },
    {
      id: 'stats',
      className: 'stats',
      icon: '📊',
      title: 'İSTATİSTİK',
      subtitle: 'Detaylı Analiz<br />ve Raporlar',
      route: '/istatistikler'
    },
    {
      id: 'leaderboard',
      className: 'leaderboard',
      icon: '🏆',
      title: 'LİDERLİK',
      subtitle: 'Sıralama<br />Tablosu',
      route: '/leaderboard'
    }
  ], []);

  // Memoized user data calculations - Optimized for mobile
  const userData = useMemo(() => {
    if (!user) return null;
    
    const energy = user.energy ?? 0;
    const energyLimit = user.energyLimit || 100;
    const experience = user.stats.experience || 0;
    const experienceToNext = user.stats.experienceToNext || 0;
    const totalExperience = experience + experienceToNext;
    const xpProgress = experienceToNext > 0 ? (experience / totalExperience) * 100 : 100;
    
    return {
      energy,
      energyLimit,
      experience,
      experienceToNext,
      totalExperience,
      xpProgress: Math.min(100, Math.round(xpProgress)),
      isEnergyFull: energy === energyLimit,
      isEnergyMax: energy === 100
    };
  }, [user]);

  // Memoized countdown display - Reduced updates for mobile
  const countdownDisplay = useMemo(() => {
    if (regenCountdown <= 0 || regenCountdown >= 10000) return null;
    const minutes = Math.floor(regenCountdown / 60);
    const seconds = (regenCountdown % 60).toString().padStart(2, '0');
    return `Yeni enerji için: ${minutes}:${seconds}`;
  }, [regenCountdown]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update user ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Cleanup function for memory management
  const cleanup = useCallback(() => {
    if (energyTimer) {
      clearInterval(energyTimer);
      setEnergyTimer(null);
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, [energyTimer]);

  // Cleanup on unmount - Enhanced memory management
  useEffect(() => {
    return () => {
      cleanup();
      // Clear all refs
      userRef.current = null;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [cleanup]);

  // Memoized energy calculation - Optimized for mobile
  const energyCalculation = useMemo(() => {
    if (!user) return null;
    
    const ENERGY_MAX = user.energyLimit || 100;
    const ENERGY_REGEN_SPEED = user.energyRegenSpeed || 300;
    const ENERGY_PER_REGEN = 1;
    const now = new Date();
    const lastUpdate = user.lastEnergyUpdate ? new Date(user.lastEnergyUpdate) : now;
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const regenCount = Math.floor(diffSeconds / ENERGY_REGEN_SPEED);
    
    return {
      ENERGY_MAX,
      ENERGY_REGEN_SPEED,
      ENERGY_PER_REGEN,
      lastUpdate,
      diffMs,
      regenCount
    };
  }, [user]);

  // Handle level up modal
  useEffect(() => {
    if (location.state?.xpResult) {
      const { xpResult } = location.state;
      if (xpResult.levelUp || xpResult.newRankUnlocked) {
        setLevelModalData(xpResult);
        setShowLevelModal(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Optimized energy regeneration algorithm - Mobile optimized intervals
  useEffect(() => {
    if (!user || !energyCalculation) return;
    
    const {
      ENERGY_MAX,
      ENERGY_REGEN_SPEED,
      ENERGY_PER_REGEN,
      lastUpdate,
      diffMs,
      regenCount
    } = energyCalculation;

    let interval: NodeJS.Timeout | null = null;
    
    if (regenCount > 0 && (user.energy ?? 0) < ENERGY_MAX) {
      const newEnergy = Math.min(ENERGY_MAX, (user.energy ?? 0) + regenCount * ENERGY_PER_REGEN);
      const secondsUsed = regenCount * ENERGY_REGEN_SPEED;
      const newLastUpdate = new Date(lastUpdate.getTime() + secondsUsed * 1000);
      updateUserEnergy(user.id, newEnergy, newLastUpdate.toISOString());
      updateUser({ ...user, energy: newEnergy, lastEnergyUpdate: newLastUpdate.toISOString() });
      
      const now2 = new Date();
      const diffMs2 = now2.getTime() - newLastUpdate.getTime();
      const secondsSinceLast2 = Math.floor(diffMs2 / 1000);
      const secondsToNext2 = Math.max(0, ENERGY_REGEN_SPEED - (secondsSinceLast2 % ENERGY_REGEN_SPEED));
      setRegenCountdown(secondsToNext2);
      setJustRegenerated(true);
    } else {
      const secondsSinceLast = Math.floor(diffMs / 1000);
      const secondsToNext = Math.max(0, ENERGY_REGEN_SPEED - (secondsSinceLast % ENERGY_REGEN_SPEED));
      setRegenCountdown(secondsToNext);
      setJustRegenerated(false);
    }
    
    // Mobile optimized interval - 10 seconds for mobile, 5 for desktop
    const intervalTime = isMobile ? 10000 : 5000;
    
    interval = setInterval(() => {
      setRegenCountdown(prev => {
        if (prev <= intervalTime / 1000) {
          if (justRegenerated) {
            setJustRegenerated(false);
            return ENERGY_REGEN_SPEED;
          }
          
          const currentUser = userRef.current;
          if (currentUser && (currentUser.energy ?? 0) < (currentUser.energyLimit || 100)) {
            const newEnergy = Math.min(currentUser.energyLimit || 100, (currentUser.energy ?? 0) + 1);
            const newLastUpdate = new Date().toISOString();
            updateUserEnergy(currentUser.id, newEnergy, newLastUpdate);
            updateUser({ ...currentUser, energy: newEnergy, lastEnergyUpdate: newLastUpdate });
          }
          return ENERGY_REGEN_SPEED;
        }
        return prev - (intervalTime / 1000);
      });
    }, intervalTime);
    
    setEnergyTimer(interval);
    cleanupRef.current = () => {
      if (interval) clearInterval(interval);
    };
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?.id, energyCalculation, justRegenerated, updateUser, isMobile]);

  // Refresh user data
  useEffect(() => {
    if (refreshUser) {
      refreshUser().then(() => {
        if (process.env['NODE_ENV'] === 'development') {
          console.log('Home - Joker hakları güncellendi:', user?.jokers);
        }
      });
    }
  }, [refreshUser, user?.jokers, user]);

  // Development logging - Disabled for production
  useEffect(() => {
    if (user?.jokers && process.env['NODE_ENV'] === 'development') {
      // console.log('Home - Mevcut joker hakları:', user.jokers);
      // console.log('Home - Joker kullanım sayıları:', user.jokersUsed);
    }
  }, [user?.jokers, user?.jokersUsed]);

  // Optimized event handlers
  const handleEditProfile = useCallback(() => {
    if (process.env['NODE_ENV'] === 'development') {
      // console.log("Profil düzenleme sayfasına git...");
    }
    navigate('/edit-profile');
  }, [navigate]);

  const handleMarketClick = useCallback(() => {
    navigate('/market');
  }, [navigate]);

  const handleCategoryClick = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  const handleCategoryKeyDown = useCallback((e: React.KeyboardEvent, route: string) => {
    if (e.key === 'Enter') {
      navigate(route);
    }
  }, [navigate]);

  const handleCloseLevelUpModal = useCallback(() => {
    setShowLevelModal(false);
  }, []);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  if (!user || !userData) {
    return <Navigate to="/login" />;
  }

  return (
    <GradientBackground 
      variant="home" 
      showParticles={!isMobile} // Disable particles on mobile for performance
      particleCount={isMobile ? 0 : 3} // Reduce particle count
    >
      <div className="home-container">
        <div className="content-wrapper">
          {showLevelModal && levelModalData && (
            <div className="levelup-modal-overlay">
              <div className="levelup-modal">
                <div className="confetti"></div>
                <h2>Tebrikler!</h2>
                {levelModalData.levelUp && (
                  <p><b>{levelModalData.newLevel}. Seviye</b> oldun!</p>
                )}
                {levelModalData.newRankUnlocked && (
                  <p><b>{levelModalData.newRank}</b> ünvanını almaya hak kazandın!</p>
                )}
                <p>Başarı Oranı: %{Math.round(levelModalData.percent)}<br/>Kazandığın XP: <b>{levelModalData.gainedXp} XP</b></p>
                <button className="close-modal-btn" onClick={handleCloseLevelUpModal}>Kapat</button>
              </div>
            </div>
          )}
          
          {/* Profil Kartı */}
          <div className="profile-card">
            <div className="profile-card-inner">
              <div className="profile-content">
                <div className="profile-avatar-container">
                  <div className="profile-avatar">
                    {user.avatar || '👤'}
                  </div>
                </div>
                <div className="profile-name">{user.displayName}</div>
                <div className="profile-rank">{user.stats.rank || ''}</div>
                <div className="profile-level">
                  <span className="profile-level-label">Seviye</span>
                  <span className="profile-level-number">{user.stats.level || 1}</span>
                </div>
                <div className="xp-progress-container">
                  <div 
                    className="xp-progress-bar"
                    style={{ width: `${userData.xpProgress}%` }}
                  ></div>
                </div>
                <div className="xp-info">
                  <span>{userData.experience} / {userData.totalExperience} XP</span>
                  {userData.experienceToNext > 0 && <span className="xp-remaining">({userData.experienceToNext} XP kaldı)</span>}
                </div>
                <div className="coin-display">
                  <div className="coin-container">
                    <span className="coin-icon">🪙</span>
                    <span className="coin-amount">{user.coins ?? 0}</span>
                    <span className="coin-label">coin</span>
                  </div>
                </div>
              </div>
              
              {/* Enerji Barı */}
              <div className="energy-container">
                <div 
                  className={`energy-bar ${userData.isEnergyFull ? 'full' : 'not-full'}`}
                  style={{ width: `${(userData.energy / userData.energyLimit) * 100}%` }}
                >
                  <span className={`energy-pulse ${userData.isEnergyMax ? 'full' : ''}`} />
                  <span className={`energy-lightning ${userData.isEnergyMax ? 'full' : ''}`}>⚡</span>
                </div>
              </div>
              <div className="energy-info">
                <span className="energy-amount">
                  <span className="energy-current">{userData.energy}</span>
                  <span className="energy-max">/ {userData.energyLimit}</span>
                </span>
                <div className="energy-timer">
                  <span className="energy-clock">⏳</span>
                  {countdownDisplay}
                </div>
              </div>
            </div>
          </div>
          
          {/* Streak Card */}
          <StreakCard />
          
          <SettingsActions onEditProfile={handleEditProfile} onLogout={logout} />
          
          {/* Sosyal Medya Butonları */}
          <div className="social-media-container">
            <a 
              href="https://www.youtube.com/@yksquiztest" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-media-btn youtube"
            >
              <span className="social-media-icon">📺</span>
              <span className="social-media-text">YouTube</span>
            </a>
            <a 
              href="https://t.me/egitimyardimcim" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-media-btn telegram"
            >
              <span className="social-media-icon">📱</span>
              <span className="social-media-text">Telegram</span>
            </a>
            <a 
              href="https://www.instagram.com/yksquiztest/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-media-btn instagram"
            >
              <span className="social-media-icon">📷</span>
              <span className="social-media-text">Instagram</span>
            </a>
            <a 
              href="https://www.shopier.com/egitimyardimcim" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-media-btn shopier"
            >
              <span className="social-media-icon">🛍️</span>
              <span className="social-media-text">Shopier</span>
            </a>
          </div>
          
          {/* ---- YENİ DÜZENLEME ---- */}
          {/* Butonları ortalamak için sarmalayıcı */}
          <div className="home-actions-container">
            {/* MARKET Butonu */}
            <div className="market-button">
              <button className="market-btn" onClick={handleMarketClick}>
                🛒 MARKET
              </button>
            </div>
            
            {/* --- YENİ MODERN DAVET BANNER'I --- */}
            <div className="referral-banner-modern" onClick={handleOpenModal} role="button" tabIndex={0}>
              <div className="referral-banner-icon">🚀</div>
              <div className="referral-banner-text">
                <div className="referral-banner-title">Davet Et, Kazan!</div>
              </div>
            </div>
            {/* --- BİTTİ --- */}
          </div>
          {/* ---- BİTTİ ---- */}

          <div className="welcome-container">
            <div className="welcome-card-wrapper">
              <div className="welcome-card">
                <div className="welcome-bg-gradient" />
                <div className="welcome-shine" />
                <div className="welcome-content">
                  <span className="welcome-emoji">👋</span>
                  <span className="welcome-text">Hoşgeldin,</span>
                  <span className="welcome-name">{user.displayName || 'Kullanıcı'}</span>
                  <span className="welcome-celebration">🎉</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              {categoryCards.map((card) => (
                <div
                  key={card.id}
                  className={`category-card ${card.className}`}
                  onClick={() => handleCategoryClick(card.route)}
                  tabIndex={0}
                  onKeyDown={card.hasEnterKey ? (e) => handleCategoryKeyDown(e, card.route) : undefined}
                >
                  <div className="category-icon">{card.icon}</div>
                  <div className="category-content">
                    <span className="category-title">{card.title}</span>
                    <span 
                      className={`category-subtitle ${card.subtitle.includes('<br />') ? '' : 'single-line'}`}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.subtitle) }}
                    />
                  </div>
                  <span className="category-shine" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal'ı render et */}
      <ReferralModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </GradientBackground>
  );
});

export default Home; 