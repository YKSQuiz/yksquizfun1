import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area } from 'recharts';
import { FiTarget, FiClock, FiCheckCircle, FiXCircle, FiBarChart2, FiPercent, FiCalendar, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../../contexts/AuthContext';
import { UserStats } from '../../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { GradientBackground, BackButton } from '../../common/ui';
import StreakCard from '../home/StreakCard';
import './Stats.css';

// Istanbul saatine göre tarih anahtarı oluştur
const getIstanbulDateKey = (date: Date): string => {
  const istanbulDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  return istanbulDate.toISOString().split('T')[0];
};

// Tarih aralığı dizisi oluştur
const getDateRangeArray = (range: 'week' | 'month' | '3months'): Date[] => {
  const now = new Date();
  const istanbulToday = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  
  const days = range === 'month' ? 30 : range === '3months' ? 90 : 7;
  
  const arr: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(istanbulToday);
    d.setDate(istanbulToday.getDate() - i);
    arr.push(d);
  }
  return arr;
};

// Özel tooltip bileşeni
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e5e7eb', 
      borderRadius: 12, 
      padding: 16, 
      boxShadow: '0 2px 12px #2563eb22', 
      minWidth: 120 
    }}>
      <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.stroke, fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// Joker listesi konfigürasyonu
const JOKER_CONFIG = [
  { icon: '➗', label: '%50 Joker', key: 'eliminate', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { icon: '⏰', label: 'Ekstra Süre', key: 'extraTime', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { icon: '2️⃣', label: 'Çift Cevap', key: 'doubleAnswer', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { icon: '✅', label: 'Direkt Doğru', key: 'autoCorrect', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
];

// Motivasyon sözleri
const MOTIVATION_QUOTES = [
  "Başarı, tekrar tekrar denemekten geçer!",
  "Bugün attığın küçük adımlar, yarının büyük başarısıdır.",
  "Vazgeçme, en zor anlar en yakın olduğun anlardır.",
  "Her gün bir adım daha ileri!",
  "Kendine inan, başarabilirsin!",
  "Zorluklar, seni daha güçlü yapar.",
  "Hayallerin için çalışmaya devam et!",
  "Başlamak için mükemmel olmak zorunda değilsin."
];

const Istatistiklerim: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | '3months'>('week');

  // İstatistik hesaplamaları
  const totalCorrect = userStats?.correctAnswers || 0;
  const totalQuestions = userStats?.totalQuestions || 0;
  const totalQuizzes = userStats?.totalQuizzes || 0;
  const experience = userStats?.experience || 0;
  const level = userStats?.level || 1;
  const rank = userStats?.rank || '';
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Zaman hesaplamaları
  const totalQuizSeconds = userStats?.totalQuizTime || 0;
  const quizMinutes = Math.floor(totalQuizSeconds / 60);
  const sessionMinutes = userStats?.totalSessionTime || 0;

  // Grafik verisi hazırlama
  const dateArray = getDateRangeArray(selectedRange);
  const chartData = dateArray.map((dateObj: Date) => {
    const dateKey = getIstanbulDateKey(dateObj);
    const activity = userStats?.dailyActivity?.[dateKey] || { questionsSolved: 0, correctAnswers: 0 };
    
    return {
      date: dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
      solved: activity.questionsSolved || 0,
      correct: activity.correctAnswers || 0,
      incorrect: (activity.questionsSolved || 0) - (activity.correctAnswers || 0)
    };
  });

  // Grafik özet istatistikleri
  const chartTotalSolved = chartData.reduce((sum, d) => sum + d.solved, 0);
  const chartTotalCorrect = chartData.reduce((sum, d) => sum + d.correct, 0);
  const chartTotalIncorrect = chartData.reduce((sum, d) => sum + d.incorrect, 0);
  const chartSuccessRate = chartTotalSolved > 0 ? Math.round((chartTotalCorrect / chartTotalSolved) * 100) : 0;
  const chartAvgDaily = chartData.length > 0 ? Math.round(chartTotalSolved / chartData.length) : 0;

  // Firestore'dan veri çekme
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const statsWithSessionTime = {
            ...userData.stats,
            totalSessionTime: userData.totalSessionTime || userData.stats?.totalSessionTime || 0
          };
          
          setUserStats(statsWithSessionTime);
        }
      } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="stats-container">
        <div className="stats-loading">
          <div className="stats-loading-spinner"></div>
          <p>İstatistikler yükleniyor...</p>
        </div>
      </div>
    );
  }

  const todayQuote = MOTIVATION_QUOTES[new Date().getDate() % MOTIVATION_QUOTES.length];

  return (
    <GradientBackground variant="stats" showParticles={true} particleCount={10}>
      <div className="container stats-page">
        <BackButton />
        
        {/* Başlık */}
        <div className="stats-header-modern" style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center'}}>
            <h1 className="stats-main-title" style={{marginBottom: 6}}>Detaylı Analiz & İstatistiklerim</h1>
            <div className="stats-user-greeting">Merhaba, {user?.displayName || "Kullanıcı"}!</div>
          </div>
        </div>

        {/* Üst İstatistikler */}
        <div className="stats modern-stats-grid">
          <div className="stat-card streak-card">
            <StreakCard variant="simple" />
          </div>
          <div className="stat-card time-card">
            <div className="stat-icon stat-icon-time"><FiClock size={32}/></div>
            <h3>Zaman İstatistikleri</h3>
            <div className="time-stats-container">
              <div className="time-stat-item quiz-time">
                <div className="time-stat-content">
                  <span className="time-stat-icon">🎯</span>
                  <span className="time-stat-label">Quiz Süresi</span>
                </div>
                <span className="time-stat-value">{quizMinutes} dk</span>
              </div>
              <div className="time-stat-item app-time">
                <div className="time-stat-content">
                  <span className="time-stat-icon">📱</span>
                  <span className="time-stat-label">Uygulama Süresi</span>
                </div>
                <span className="time-stat-value">{sessionMinutes} dk</span>
              </div>
            </div>
          </div>
          <div className="stat-card xp-card">
            <div className="stat-icon stat-icon-xp"><FiTarget size={32}/></div>
            <h3>XP & Seviye</h3>
            <div className="stat-value">{experience} <span style={{fontSize: '1.1rem', color: '#b45309', fontWeight: 700}}>XP</span></div>
            <div className="stat-detail">Seviye: <span style={{color: '#7c3aed', fontWeight: 900}}>{level}</span></div>
            {rank && <div className="stat-detail">{rank}</div>}
          </div>
        </div>

        {/* Alt İstatistikler */}
        <div className="modern-stats-grid">
          <div className="stat-card success-card">
            <div className="stat-icon stat-icon-success"><FiTarget size={32}/></div>
            <h3>Genel Başarı Oranı</h3>
            <div className="stat-value">{successRate}%</div>
            <div className="stat-detail">{totalCorrect} / {totalQuestions} doğru</div>
          </div>
          <div className="stat-card test-card">
            <div className="stat-icon stat-icon-test"><FiBarChart2 size={32}/></div>
            <h3>Toplam Test</h3>
            <div className="stat-value">{totalQuizzes}</div>
            <div className="stat-detail">Çözülmüş Test</div>
          </div>
          <div className="stat-card referral-card">
            <div className="stat-icon stat-icon-referral"><FiUsers size={32} /></div>
            <h3>Başarılı Davet</h3>
            <div className="stat-value">{user?.referral?.allTimeInvites || 0}</div>
            <div className="stat-detail">Kişi Davet Edildi</div>
          </div>
        </div>

        {/* Grafik Bölümü */}
        <div className="stats-chart-section">
          <div className="chart-header">
            <h2 className="chart-title">Zamana Göre Soru Çözüm Grafiği</h2>
            <div className="chart-underline"></div>
          </div>
          
          <div className="chart-range-buttons">
            {[
              { key: 'week', label: 'Son 1 Hafta' },
              { key: 'month', label: 'Son 1 Ay' },
              { key: '3months', label: 'Son 3 Ay' }
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`stats-range-btn${selectedRange === key ? ' active' : ''}`}
                onClick={() => setSelectedRange(key as any)}
              >
                {label}
              </button>
            ))}
          </div>
          
          <div className="chart-container">
            {chartData.length === 0 ? (
              <div className="chart-empty-state">Bu aralıkta gösterilecek veri yok.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e0e7ef" />
                  <XAxis dataKey="date" tick={{ fontSize: 14, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#64748b' }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontWeight: 700, fontSize: 15, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="solved" stroke="#2563eb" fill="#2563eb22" name="Çözülen Soru" fillOpacity={0.25} />
                  <Line type="monotone" dataKey="solved" name="Çözülen Soru" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="correct" name="Doğru" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="incorrect" name="Yanlış" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Grafik Özet İstatistikleri */}
          <div className="chart-summary-stats">
            {[
              { icon: <FiBarChart2 size={28} color="#2563eb" />, label: 'Çözülen Soru', value: chartTotalSolved },
              { icon: <FiCheckCircle size={28} color="#22c55e" />, label: 'Toplam Doğru', value: chartTotalCorrect },
              { icon: <FiXCircle size={28} color="#ef4444" />, label: 'Toplam Yanlış', value: chartTotalIncorrect },
              { icon: <FiPercent size={28} color="#facc15" />, label: 'Başarı Oranı', value: `${chartSuccessRate}%` },
              { icon: <FiCalendar size={28} color="#6366f1" />, label: 'Ortalama Günlük Soru', value: chartAvgDaily }
            ].map((stat, index) => (
              <div key={index} className={`summary-stat-card ${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.icon}
                <div className="summary-stat-label">{stat.label}</div>
                <div className="summary-stat-value">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Joker İstatistikleri */}
        {user?.jokersUsed && (
          <div className="modern-joker-container">
            <div className="modern-joker-header">
              <h2 className="modern-joker-title">🎮 Joker Kullanım İstatistikleri</h2>
              <p className="modern-joker-subtitle">Stratejik oyun deneyiminizin özeti</p>
            </div>
            
            <div className="modern-joker-grid">
              {JOKER_CONFIG.map((joker) => (
                <div key={joker.key} className="modern-joker-card">
                  <span className="modern-joker-icon">{joker.icon}</span>
                  <div className="modern-joker-label">{joker.label}</div>
                  <div className="modern-joker-value">{user.jokersUsed[joker.key as keyof typeof user.jokersUsed] || 0}</div>
                </div>
              ))}
            </div>
            
            <div className="modern-joker-total-section">
              <div className="modern-joker-total-card">
                <div className="modern-joker-total-icon">🎯</div>
                <div className="modern-joker-total-label">Toplam Kullanılan Joker</div>
                <div className="modern-joker-total-value">
                  {Object.values(user.jokersUsed).reduce((a: any, b: any) => a + b, 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boş Durum Mesajı */}
        {(!userStats || userStats.totalQuestions === 0) && (
          <div className="extra-empty-msg">
            <FiTarget size={28} style={{marginBottom: 8, color: '#2563eb'}}/>
            <div className="extra-empty-title">Henüz hiç test çözmedin!</div>
            <div className="extra-empty-desc">Haydi ilk testini çöz, gelişimini buradan takip edebilirsin!</div>
          </div>
        )}

        {/* Motivasyon Kartı */}
        <div className="section-spacing">
          <div className="motivation-card">
            <div className="motivation-icon">✨</div>
            <h3 className="motivation-title">Günün Motivasyonu</h3>
            <div className="motivation-quote">{todayQuote}</div>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
});

export default Istatistiklerim; 