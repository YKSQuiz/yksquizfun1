import React from 'react';
import Leaderboard from './Leaderboard';
import { GradientBackground } from '../../common/ui';
import BackButton from '../../common/ui/BackButton';
import './LeaderboardPage.css';

const LeaderboardPage: React.FC = () => {
  return (
    <GradientBackground>
      <div className="leaderboard-page-container">
        <div className="leaderboard-page-back-button">
          <BackButton className="leaderboard-page-back-btn" />
        </div>
        
        <div className="leaderboard-page-header">
          <h1>Liderlik Tablosu</h1>
          <p>Diğer kullanıcılarla yarışın ve sıralamada yükselin!</p>
        </div>
        
        <div className="leaderboard-page-content">
          <Leaderboard />
        </div>
      </div>
    </GradientBackground>
  );
};

export default LeaderboardPage;
