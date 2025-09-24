import React, { useState, useEffect } from 'react';
import { FiStar, FiAward, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import { GiFire } from 'react-icons/gi';
import { useAuth } from '../../../contexts/AuthContext';
import { getStreakInfo, updateStreak } from '../../../services/firebase/user';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  totalCoinsEarned: number;
  coins: number;
}

interface StreakCardProps {
  variant?: 'compact' | 'simple';
}

const StreakCard: React.FC<StreakCardProps> = ({ variant = 'compact' }) => {
  const { user } = useAuth();
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReward, setShowReward] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [newCoins, setNewCoins] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreakInfo();
    }
  }, [user]);

  const loadStreakInfo = async () => {
    if (!user) return;
    
    try {
      const info = await getStreakInfo(user.id);
      setStreakInfo(info);
    } catch (error) {
      console.error('Streak bilgileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStreakUpdate = async () => {
    if (!user || isAnimating) return;
    
    setIsAnimating(true);
    
    try {
      const result = await updateStreak(user.id);
      if (result.success) {
        setStreakInfo({
          currentStreak: result.streak,
          longestStreak: result.streak > (streakInfo?.longestStreak || 0) ? result.streak : (streakInfo?.longestStreak || 0),
          lastLoginDate: new Date().toISOString().split('T')[0],
          totalCoinsEarned: (streakInfo?.totalCoinsEarned || 0) + (result.newCoins || 0),
          coins: result.coins
        });
        
        if (result.newCoins && result.newCoins > 0) {
          setRewardMessage(result.message);
          setNewCoins(result.newCoins);
          setShowReward(true);
          
          setTimeout(() => {
            setShowReward(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Streak güncellenirken hata:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  if (loading) {
    if (variant === 'compact') {
      return (
        <div className="streak-card-compact loading">
          <div className="streak-loading-spinner"></div>
        </div>
      );
    } else {
      return (
        <div className="streak-card-simple loading">
          <div className="streak-loading-container">
            <div className="streak-loading-spinner"></div>
            <p>Streak bilgileri yükleniyor...</p>
          </div>
        </div>
      );
    }
  }

  if (!streakInfo) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const hasLoggedInToday = streakInfo.lastLoginDate === today;
  const progressPercentage = Math.min((streakInfo.currentStreak / 7) * 100, 100);
  const nextReward = 100 + streakInfo.currentStreak * 50;

  // Compact Variant (Home sayfası için)
  if (variant === 'compact') {
    return (
      <>
        <div className="streak-card-compact">
          {/* Header */}
          <div className="streak-compact-header">
            <div className="streak-compact-title">
              <span className="streak-title-compact">🔥 Günlük Seri 🔥</span>
            </div>
            <div className="streak-compact-subtitle">Her gün giriş yap, coin kazan!</div>
          </div>

          {/* Stats Row */}
          <div className="streak-compact-stats">
            <div className="streak-compact-stat">
              <div className="streak-stat-icon-compact">
                <GiFire size={18} />
              </div>
              <div className="streak-stat-content-compact">
                <div className="streak-stat-value-compact">{streakInfo.currentStreak}</div>
                <div className="streak-stat-label-compact">GÜNLÜK SERİ</div>
              </div>
            </div>
            
            <div className="streak-compact-stat">
              <div className="streak-stat-icon-compact">
                <FiAward size={18} />
              </div>
              <div className="streak-stat-content-compact">
                <div className="streak-stat-value-compact">{streakInfo.longestStreak}</div>
                <div className="streak-stat-label-compact">EN UZUN</div>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="streak-compact-status">
            {hasLoggedInToday ? (
              <div className="streak-logged-in-compact">
                <div className="streak-success-content-compact">
                  <FiCheckCircle size={14} className="streak-success-icon-compact" />
                  <span className="streak-success-text-compact">Bugün giriş yaptın!</span>
                </div>
                <div className="streak-next-reward-compact">
                  <FiClock size={10} />
                  <span>Yarın: +{nextReward} coin</span>
                </div>
              </div>
            ) : (
              <button 
                className={`streak-compact-btn ${isAnimating ? 'animating' : ''}`}
                onClick={handleStreakUpdate}
                disabled={isAnimating}
              >
                <GiFire className="streak-btn-icon-compact" />
                <span>Ödülü Al</span>
              </button>
            )}
          </div>
        </div>

        {/* Ödül Bildirimi */}
        {showReward && (
          <div className="streak-reward-notification-compact">
            <div className="streak-reward-content-compact">
              <div className="streak-reward-icon-compact">🎉</div>
              <div className="streak-reward-message-compact">{rewardMessage}</div>
              <div className="streak-reward-coins-compact">+{newCoins} 💰</div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Simple Variant (Stats sayfası için)
  return (
    <>
      <div className="streak-card-simple">
        {/* Header Section */}
        <div className="streak-header-simple">
          <div className="streak-icon-simple">
            <GiFire size={24} />
          </div>
          <div className="streak-title-simple">
            <h3>🔥 Günlük Seri</h3>
            <p>Her gün giriş yap, coin kazan!</p>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="streak-stats-simple">
          <div className="streak-stat-simple">
            <div className="streak-stat-icon-simple">
              <GiFire size={20} />
            </div>
            <div className="streak-stat-content-simple">
              <div className="streak-stat-value-simple">{streakInfo.currentStreak}</div>
              <div className="streak-stat-label-simple">Günlük Seri</div>
            </div>
          </div>
          
          <div className="streak-stat-simple">
            <div className="streak-stat-icon-simple">
              <FiAward size={20} />
            </div>
            <div className="streak-stat-content-simple">
              <div className="streak-stat-value-simple">{streakInfo.longestStreak}</div>
              <div className="streak-stat-label-simple">En Uzun Seri</div>
            </div>
          </div>
        </div>
        
        {/* Action Section */}
        <div className="streak-actions-simple">
          {hasLoggedInToday ? (
            <div className="streak-logged-in-simple">
              <div className="streak-success-icon-simple">
                <FiCheckCircle size={20} />
              </div>
              <div className="streak-success-content-simple">
                <span className="streak-success-text-simple">✅ Bugün zaten giriş yaptın!</span>
                <div className="streak-next-reward-simple">
                  <FiClock size={14} />
                  <span>Yarın: +{nextReward} coin</span>
                </div>
              </div>
            </div>
          ) : (
            <button 
              className={`streak-login-btn-simple ${isAnimating ? 'animating' : ''}`}
              onClick={handleStreakUpdate}
              disabled={isAnimating}
            >
              <GiFire size={18} />
              <span>Bugün Giriş Yap</span>
            </button>
          )}
        </div>
        
        {/* Progress Section */}
        <div className="streak-progress-simple">
          <div className="streak-progress-header-simple">
            <span className="progress-label-simple">Haftalık Hedef</span>
            <span className="progress-value-simple">{streakInfo.currentStreak}/7</span>
          </div>
          <div className="streak-progress-bar-simple">
            <div className="streak-progress-track-simple">
              <div 
                className="streak-progress-fill-simple"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simple Reward Notification */}
      {showReward && (
        <div className="streak-reward-notification-simple">
          <div className="streak-reward-content-simple">
            <div className="reward-icon-simple">🎉</div>
            <div className="reward-message-simple">{rewardMessage}</div>
            <div className="reward-coins-simple">+{newCoins} 💰</div>
          </div>
        </div>
      )}
    </>
  );
};

export default StreakCard;
