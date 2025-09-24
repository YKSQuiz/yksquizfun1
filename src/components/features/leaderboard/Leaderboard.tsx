import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  subscribeLeaderboard,
  getLeaderboardUpdateSchedule,
  getUserMonthlyRewards,
  generateUserMotivationMessage,
} from '../../../services/firebase/leaderboard';
import {
  LeaderboardData,
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_PERIODS,
  RewardData,
  MotivationMessage,
} from '../../../types/leaderboard';

import './Leaderboard.css';

interface LeaderboardProps {
  className?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'allTime'>('monthly');
  const [selectedCategory, setSelectedCategory] = useState<'top_xp' | 'top_correct' | 'top_coin' | 'top_streak'>('top_xp');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRewards, setUserRewards] = useState<RewardData[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState<MotivationMessage | null>(null);
  
  // Sayfalama state'leri
  const [itemsPerPage, setItemsPerPage] = useState<20 | 50 | 100>(20);
  const [currentPage, setCurrentPage] = useState(1);

  const updateSchedule = useMemo(() => getLeaderboardUpdateSchedule(), []);

  const currentCategoryData = useMemo(() => {
    return leaderboardData?.[selectedCategory] || [];
  }, [leaderboardData, selectedCategory]);

  const userEntry = useMemo(() => {
    return currentCategoryData.find(entry => entry.userId === user?.id);
  }, [currentCategoryData, user?.id]);

  // Sayfalama hesaplamaları
  const totalPages = useMemo(() => {
    return Math.ceil(currentCategoryData.length / itemsPerPage);
  }, [currentCategoryData.length, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return currentCategoryData.slice(startIndex, endIndex);
  }, [currentCategoryData, currentPage, itemsPerPage]);

  // Sayfa değiştiğinde veya kategori değiştiğinde ilk sayfaya dön
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedPeriod, itemsPerPage]);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setMotivationMessage(null);
      setUserRewards([]);
      return;
    }
    try {
      const [rewards, motivation] = await Promise.all([
        getUserMonthlyRewards(user.id, new Date().toISOString().slice(0, 7)),
        generateUserMotivationMessage(user.id, selectedCategory, selectedPeriod)
      ]);
      setUserRewards(rewards);
      setMotivationMessage(motivation);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user, selectedCategory, selectedPeriod]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeLeaderboard(selectedPeriod, (data) => {
      setLeaderboardData(data);
      setLoading(false);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedPeriod, selectedCategory]);

  useEffect(() => {
    if (user && leaderboardData) {
      loadUserData();
    }
  }, [user, leaderboardData, selectedCategory, loadUserData]);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    if (rank >= 4 && rank <= 10) return 'rank-purple';
    return 'rank-normal';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank >= 4 && rank <= 10) return '💜';
    return '👤';
  };

  const formatValue = (value: number, category: string) => {
    if (category === 'top_streak') return `${value} gün`;
    if (category === 'top_coin') return `${value.toLocaleString()} coin`;
    if (category === 'top_xp') return `${value.toLocaleString()} XP`;
    return `${value.toLocaleString()}`;
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = LEADERBOARD_CATEGORIES.find(c => c.key === category);
    return categoryData?.icon || '📊';
  };

  const getCategoryTitle = (category: string) => {
    const categoryData = LEADERBOARD_CATEGORIES.find(c => c.key === category);
    return categoryData?.title || 'Sıralama';
  };

  return (
    <div className={`leaderboard-container ${className}`}>
      <div className="leaderboard-header">
        <h2>🏆 Liderlik Tablosu</h2>
        <p className="update-schedule">{updateSchedule.description}</p>
      </div>

      <div className="period-tabs">
        {LEADERBOARD_PERIODS.map(period => (
          <button
            key={period.key}
            className={`period-tab ${selectedPeriod === period.key ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(period.key)}
          >
            {period.title}
          </button>
        ))}
      </div>

      <div className="category-tabs">
        {LEADERBOARD_CATEGORIES.map(category => (
          <button
            key={category.key}
            className={`category-tab ${selectedCategory === category.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.key as any)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-title">{category.title}</span>
          </button>
        ))}
      </div>

      {motivationMessage && (
        <div className="motivation-message">
          <div className="motivation-icon">
            {motivationMessage.type === 'encouragement' ? '💪' : '🎉'}
          </div>
          <div className="motivation-content">
            <p>{motivationMessage.message}</p>
            {motivationMessage.requiredPoints && (
              <small>Hedef: +{motivationMessage.requiredPoints.toLocaleString()} {getCategoryTitle(selectedCategory)}</small>
            )}
          </div>
        </div>
      )}

      {userRewards.length > 0 && (
        <div className="reward-notification">
          <div className="reward-header">
            <h3>🎁 Bu Ay Kazandığın Ödüller</h3>
            <button 
              className="reward-toggle-btn"
              onClick={() => setShowRewards(!showRewards)}
            >
              {showRewards ? 'Gizle' : 'Göster'}
            </button>
          </div>
          {showRewards && (
            <div className="reward-list">
              {userRewards.map((reward, index) => (
                <div key={index} className="reward-item">
                  <div className="reward-category">
                    {getCategoryIcon(reward.category)} {getCategoryTitle(reward.category)}
                  </div>
                  <div className="reward-details">
                    <span className="reward-rank">#{reward.rank}</span>
                    <span className="reward-amount">
                      +{reward.coinsEarned.toLocaleString()} Coin, +{reward.xpEarned.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="leaderboard-content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Liderlik tablosu yükleniyor...</p>
          </div>
        ) : (
          <>
            <div className="leaderboard-list">
              {paginatedData.map((entry, index) => (
                <div 
                  key={entry.userId} 
                  className={`leaderboard-item ${getRankStyle(entry.rank || 0)}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="rank-info">
                    <span className="rank-icon">{getRankIcon(entry.rank || 0)}</span>
                    <span className="rank-number">#{entry.rank}</span>
                  </div>
                  <div className="user-info">
                    <div className="user-avatar">
                      {entry.avatar || entry.displayName?.substring(0, 1).toUpperCase() || '👤'}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{entry.displayName}</div>
                      <div className="user-title">
                        <span className="title">{entry.title || 'Öğrenci'}</span>
                        <span className="level">Seviye {entry.level}</span>
                      </div>
                    </div>
                  </div>
                  <div className="user-value">
                    {formatValue(entry.value, selectedCategory)}
                  </div>
                </div>
              ))}
            </div>

            {user && userEntry && (
              <div className="current-user-section">
                <div className="section-divider">
                  <span>Senin Pozisyonun</span>
                </div>
                <div 
                  className={`leaderboard-item current-user-highlight ${getRankStyle(userEntry.rank || 0)}`}
                  style={{ animationDelay: '1s' }}
                >
                  <div className="rank-info">
                    <span className="rank-icon">{getRankIcon(userEntry.rank || 0)}</span>
                    <span className="rank-number">#{userEntry.rank}</span>
                  </div>
                  <div className="user-info">
                    <div className="user-avatar">
                      {userEntry.avatar || userEntry.displayName?.substring(0, 1).toUpperCase() || '👤'}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{userEntry.displayName}</div>
                      <div className="user-title">
                        <span className="title">{userEntry.title || 'Öğrenci'}</span>
                        <span className="level">Seviye {userEntry.level}</span>
                      </div>
                    </div>
                  </div>
                  <div className="user-value">
                    {formatValue(userEntry.value, selectedCategory)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sayfalama Kontrolleri */}
      {!loading && currentCategoryData.length > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            <span>
              {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, currentCategoryData.length)} / {currentCategoryData.length} kullanıcı
            </span>
          </div>
          
          <div className="pagination-options">
            <div className="items-per-page">
              <label>Göster:</label>
              <select 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(Number(e.target.value) as 20 | 50 | 100)}
                className="items-select"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="page-navigation">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="nav-button prev-button"
              >
                ← Önceki
              </button>
              
              <span className="page-info">
                Sayfa {currentPage} / {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="nav-button next-button"
              >
                Sonraki →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="update-info">
        <p>🕐 Veriler anlık olarak güncellenmektedir.</p>
      </div>
    </div>
  );
};

export default Leaderboard;
