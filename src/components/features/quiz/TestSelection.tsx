import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../../common/ui';
import SubjectHeader from '../../common/subjects/SubjectHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { updateUserEnergy } from '../../../services/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { altKonularConfigNew } from '../../../data/subjects';
import { firestoreCache } from '../../../utils/cacheManager';
import { logCachePerformance } from '../../../utils/cacheManager';
import './TestSelection.css';

// Error Boundary Component
class TestSelectionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TestSelection Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>
            Test Seçimi Yüklenirken Hata Oluştu
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '20px' }}>
            Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Test sonuçları için tip tanımları
// interface TestResult {
//   score: number;
//   total: number;
//   percentage: number;
//   completed: boolean;
//   attempts: number;
// }

// interface TestResults {
//   [testId: string]: TestResult;
// }

const TEST_COUNT = 5; // Geçici olarak 5 test aktif, 6-10 kapalı

// Sabit değerleri component dışına taşı
const mainTopicLabels: Record<string, string> = {
  // TYT Dersleri
  'tyt-turkce': 'TYT Türkçe',
  'tyt-tarih': 'TYT Tarih',
  'tyt-cografya': 'TYT Coğrafya',
  'tyt-felsefe': 'TYT Felsefe',
  'tyt-din': 'TYT Din',
  'tyt-matematik': 'TYT Matematik',
  'tyt-fizik': 'TYT Fizik',
  'tyt-kimya': 'TYT Kimya',
  'tyt-biyoloji': 'TYT Biyoloji',
  
  // AYT Sayısal Dersleri
  'ayt-matematik': 'AYT Matematik',
  'ayt-fizik': 'AYT Fizik',
  'ayt-kimya': 'AYT Kimya',
  'ayt-biyoloji': 'AYT Biyoloji',
  
  // AYT Eşit Ağırlık Dersleri
  'ayt-edebiyat': 'AYT Edebiyat',
  'ayt-tarih': 'AYT Tarih',
  'ayt-cografya': 'AYT Coğrafya',
  
  // AYT Sözel Dersleri
  'ayt-din': 'AYT Din Kültürü',
  'ayt-felsefe': 'AYT Felsefe',
  
  // Eski format desteği (geriye uyumluluk için)
  turkce: 'TYT Türkçe',
  tarih: 'TYT Tarih',
  cografya: 'TYT Coğrafya',
  felsefe: 'TYT Felsefe',
  din: 'TYT Din',
  matematik: 'TYT Matematik',
  fizik: 'TYT Fizik',
  kimya: 'TYT Kimya',
  biyoloji: 'TYT Biyoloji',
};

// Test kilidi fiyatları
const TEST_PRICES: Record<number, number> = {
  2: 100,
  3: 120,
  4: 140,
  5: 160,
  6: 180,
  7: 200,
  8: 220,
  9: 240,
  10: 260,
};

// Sabit gradient ve emoji dizileri
const GRADIENTS = [
  'linear-gradient(135deg, #00FF66 0%, #33FF33 100%)',
  'linear-gradient(135deg, #33FF33 0%, #66FF00 100%)',
  'linear-gradient(135deg, #66FF00 0%, #99FF00 100%)',
  'linear-gradient(135deg, #99FF00 0%, #CCFF00 100%)',
  'linear-gradient(135deg, #CCFF00 0%, #FFCC00 100%)',
  'linear-gradient(135deg, #FFCC00 0%, #FF9900 100%)',
  'linear-gradient(135deg, #FF9900 0%, #FF6600 100%)',
  'linear-gradient(135deg, #FF6600 0%, #FF3300 100%)',
  'linear-gradient(135deg, #FF3300 0%, #FF0000 100%)',
  'linear-gradient(135deg, #FF0000 0%, #b80000 100%)',
];

const EMOJIS = ['🟢', '😀', '🧩', '📘', '🧠', '🤔', '🔥', '⚡', '🚀', '🏆'];

// Optimize edilmiş Test Card bileşeni
const TestCard = React.memo<{
  testNumber: number;
  testStatus: { status: string; message: string; canUnlock: boolean };
  isTestUnlocked: boolean;
  isLocked: boolean;
  isPreviousTestSuccessful: boolean;
  testPrice?: number;
  onClick: (testNumber: number) => void;
  animationDelay: number;
}>(({ 
  testNumber, 
  testStatus, 
  isTestUnlocked, 
  isLocked, 
  isPreviousTestSuccessful, 
  testPrice, 
  onClick, 
  animationDelay
}) => {
  // Simplified styling without complex useMemo optimizations
  const cardStyle: React.CSSProperties = {
    animation: `popIn 0.5s cubic-bezier(.39,.575,.56,1.000) ${animationDelay}s both`,
    cursor: testStatus.status === 'completed' ? 'default' : 'pointer',
    position: 'relative',
    borderRadius: '15px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100px',
    transition: 'transform 0.18s, box-shadow 0.18s, filter 0.18s',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    background: testStatus.status === 'completed' ? '#ffffff' : GRADIENTS[(testNumber - 1) % GRADIENTS.length],
    border: testStatus.status === 'completed' ? `4px solid ${GRADIENTS[(testNumber - 1) % GRADIENTS.length]}` : 'none',
    opacity: testStatus.status === 'failed' ? 0.8 : isLocked ? 0.6 : 1,
    filter: testStatus.status === 'failed' ? 'grayscale(0.3)' : isLocked ? 'grayscale(0.2)' : 'none'
  };

  const cardClasses = [
    'test-card',
    'glow-effect',
    `gradient-${testNumber}`,
    testStatus.status === 'completed' ? 'completed' : '',
    testStatus.status === 'failed' ? 'failed' : '',
    isLocked ? 'locked' : ''
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (testStatus.status !== 'completed') {
      onClick(testNumber);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && testStatus.status !== 'completed') {
      onClick(testNumber);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      tabIndex={testStatus.status === 'completed' ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-disabled={isLocked && !isPreviousTestSuccessful}
      style={cardStyle}
    >
      <span className="test-emoji" aria-label="emoji" role="img">
        {EMOJIS[(testNumber - 1) % EMOJIS.length]}
      </span>
      <span className="test-label">
        Test {testNumber}
      </span>
      
      {/* Test durumu mesajı */}
      {testStatus.message && (
        <div className={`test-status ${testStatus.status === 'completed' ? 'success' : 'failed'}`}>
          {testStatus.message}
        </div>
      )}
      
      {/* Kilit ikonu ve fiyat */}
      {isLocked && !isTestUnlocked && (
        <>
          <span 
            className={`lock-icon ${isPreviousTestSuccessful ? 'unlockable' : ''}`}
            aria-label="Kilitli"
            role="img"
          >🔒</span>
          {testNumber > 1 && testPrice && (
            <div className="lock-requirement">
              <span style={{ fontSize: 10 }}>
                {isPreviousTestSuccessful ? '🪙' : '⚠️'}
              </span>
              {isPreviousTestSuccessful ? `${testPrice}` : `%70 + ${testPrice}`}
            </div>
          )}
        </>
      )}
    </div>
  );
});

TestCard.displayName = 'TestCard';

// Simplified Unlock Modal component
const UnlockModal = React.memo<{
  isOpen: boolean;
  selectedTest: number | null;
  unlockLoading: boolean;
  unlockMessage: string | null;
  userCoins: number;
  checkPreviousTestSuccess: (testNumber: number) => boolean;
  onClose: () => void;
  onUnlock: () => void;
}>(({ 
  isOpen, 
  selectedTest, 
  unlockLoading, 
  unlockMessage, 
  userCoins, 
  checkPreviousTestSuccess, 
  onClose, 
  onUnlock 
}) => {
  if (!isOpen || !selectedTest) return null;

  const testPrice = TEST_PRICES[selectedTest] || 0;
  const isPreviousTestSuccessful = checkPreviousTestSuccess(selectedTest);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#764ba2',
          margin: '0 0 16px 0'
        }}>
          Test {selectedTest} Kilitli
        </h3>
        <p style={{
          fontSize: 16,
          color: '#666',
          margin: '0 0 24px 0',
          lineHeight: 1.5
        }}>
          {!isPreviousTestSuccessful ? (
            <>
              Bu testi açmak için önce <strong>Test {selectedTest - 1}</strong>'de %70 başarı sağlamanız gerekli.
              <br />
              Ardından <strong>{testPrice} coin</strong> ile bu testi açabilirsiniz.
            </>
          ) : (
            <>
              Önceki testi başarıyla tamamladınız! 
              <br />
              Bu testi açmak için <strong>{testPrice} coin</strong> gerekli.
            </>
          )}
        </p>
        
        {unlockMessage && (
          <div style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 12,
            background: unlockMessage.includes('✅') ? '#d4edda' : '#f8d7da',
            color: unlockMessage.includes('✅') ? '#155724' : '#721c24',
            fontWeight: 600
          }}>
            {unlockMessage}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center'
        }}>
          <button
            onClick={onClose}
            className="modal-button secondary"
          >
            İptal
          </button>
          <button
            onClick={onUnlock}
            disabled={
              unlockLoading || 
              userCoins < testPrice ||
              !isPreviousTestSuccessful
            }
            className={`modal-button primary ${unlockLoading ? 'loading' : ''}`}
          >
            {unlockLoading ? 'Açılıyor...' : (
              !isPreviousTestSuccessful
                ? 'Önceki Test Gerekli'
                : `${testPrice} Coin ile Aç`
            )}
          </button>
        </div>

        {/* Coin Bilgisi */}
        <div style={{
          marginTop: 16,
          padding: '12px',
          background: 'linear-gradient(90deg, #fffbe7 0%, #ffe082 100%)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}>
          <span style={{ fontSize: 20 }}>🪙</span>
          <span style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#ffb300',
            fontFamily: 'Orbitron, monospace'
          }}>
            {userCoins} coin
          </span>
        </div>
      </div>
    </div>
  );
});

UnlockModal.displayName = 'UnlockModal';

const TestSelectionComponent: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { subTopic } = useParams();
  
  // Mobil cihaz tespiti
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);
  const mainTopic = window.location.pathname.split('/')[1];
  const { user, updateUser, getTestResults, getUnlockedTests, refreshUser } = useAuth();
  const [energyError, setEnergyError] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  // User state'ini yenile - Cache optimizasyonu ile
  useEffect(() => {
    if (user?.id) {
      // Önce cache'den kontrol et
      const cachedUser = firestoreCache.getUserData(user.id);
      if (cachedUser) {
        console.log('📊 TestSelection: Kullanıcı verisi cache\'den alındı');
        updateUser(cachedUser);
        return;
      }

      // Cache yoksa Firestore'dan çek
      console.log('📊 TestSelection: Kullanıcı verisi Firestore\'dan çekiliyor');
      refreshUser().then(() => {
        // Cache'e kaydet
        if (user) {
          firestoreCache.setUserData(user.id, user);
        }
      }).catch(() => {
        // Hata durumunda sessizce devam et
      });
    }
  }, [user?.id, refreshUser, updateUser]);

  // URL'den gelen mainTopic'ı altKonularConfigNew key'ine dönüştür
  const getConfigKey = (() => {
    const topicMapping: Record<string, string> = {
      'turkce': 'tyt-turkce',
      'tarih': 'tyt-tarih',
      'cografya': 'tyt-cografya',
      'felsefe': 'tyt-felsefe',
      'din': 'tyt-din',
      'matematik': 'tyt-matematik',
      'fizik': 'tyt-fizik',
      'kimya': 'tyt-kimya',
      'biyoloji': 'tyt-biyoloji',
      'ayt-matematik': 'ayt-matematik',
      'ayt-fizik': 'ayt-fizik',
      'ayt-kimya': 'ayt-kimya',
      'ayt-biyoloji': 'ayt-biyoloji',
      'ayt-edebiyat': 'ayt-edebiyat',
      'ayt-cografya': 'ayt-cografya',
      'ayt-tarih': 'ayt-tarih',
      'ayt-din': 'ayt-din',
      'ayt-felsefe': 'ayt-felsefe',
    };
    return topicMapping[mainTopic] || mainTopic;
  })();

  // Alt konu label'ını bul
  const getSubTopicLabel = (() => {
    const configKey = getConfigKey;
    const altKonular = altKonularConfigNew[configKey];
    if (altKonular) {
      const altKonu = altKonular.find(ak => ak.id === subTopic);
      return altKonu ? altKonu.label : subTopic;
    }
    return subTopic;
  })();

  // Subject topic key - Quiz.tsx ile tutarlı olacak şekilde tüm dersler için
  const subjectTopicKey = (() => {
    let key = `${mainTopic}_${subTopic}`;
    
    // TYT Dersleri için özel anahtar oluşturma - Tümü quiz_ prefix kullanır
    if (mainTopic === 'turkce') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'matematik') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'tarih') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'cografya') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'felsefe') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'din') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'fizik') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'kimya') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'biyoloji') {
      key = `quiz_${subTopic}`;
    }
    // AYT Dersleri için özel anahtar oluşturma - Tümü quiz_ prefix kullanır
    if (mainTopic === 'ayt-matematik') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-fizik') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-kimya') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-biyoloji') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-edebiyat') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-tarih') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-cografya') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-felsefe') {
      key = `quiz_${subTopic}`;
    }
    if (mainTopic === 'ayt-din') {
      key = `quiz_${subTopic}`;
    }
    
    return key;
  })();

  // Test sonuçları ve açılan testleri cache ile optimize et
  const testResults = useMemo(() => {
    if (!user?.id) return {};
    
    // Önce cache'den kontrol et
    const cachedResults = firestoreCache.getTestResults(user.id, subjectTopicKey);
    if (cachedResults) {
      console.log('📊 TestSelection: Test sonuçları cache\'den alındı');
      return cachedResults;
    }
    
    // Cache yoksa AuthContext'ten al ve cache'e kaydet
    const results = getTestResults(subjectTopicKey);
    firestoreCache.setTestResults(user.id, subjectTopicKey, results);
    return results;
  }, [user?.id, subjectTopicKey, getTestResults]);

  const unlockedTests = useMemo(() => {
    if (!user?.id) return [];
    
    // Önce cache'den kontrol et
    const cachedUnlocked = firestoreCache.getUnlockedTests(user.id, subjectTopicKey);
    if (cachedUnlocked) {
      console.log('📊 TestSelection: Açılan testler cache\'den alındı');
      return cachedUnlocked;
    }
    
    // Cache yoksa AuthContext'ten al ve cache'e kaydet
    const unlocked = getUnlockedTests(subjectTopicKey);
    firestoreCache.setUnlockedTests(user.id, subjectTopicKey, unlocked);
    return unlocked;
  }, [user?.id, subjectTopicKey, getUnlockedTests]);

  // Test durumunu kontrol eden fonksiyon - useCallback ile optimize et
  const getTestStatus = useCallback((testNumber: number) => {
    const testResult = testResults[testNumber.toString()];
    
    if (!testResult) {
      return { status: 'not-attempted', message: '', canUnlock: testNumber === 1 };
    }
    
    if (testResult.completed) {
      return { 
        status: 'completed', 
        message: `✅ %${testResult.percentage}`, 
        canUnlock: true 
      };
    } else {
      return { 
        status: 'failed', 
        message: `❌ %${testResult.percentage}`, 
        canUnlock: false 
      };
    }
  }, [testResults]);

  // Önceki testin başarılı olup olmadığını kontrol eden fonksiyon - useCallback ile optimize et
  const checkPreviousTestSuccess = useCallback((testNumber: number): boolean => {
    if (testNumber === 1) return true;
    
    const previousTestResult = testResults[(testNumber - 1).toString()];
    if (!previousTestResult) return false;
    
    // %70 başarı şartı
    return previousTestResult.percentage >= 70;
  }, [testResults]);

  // Test click handler'ı - useCallback ile optimize et
  const handleTestClick = useCallback(async (testNumber: number) => {
    setEnergyError(null);
    setUnlockMessage(null);

    // Test durumunu kontrol et
    const testStatus = getTestStatus(testNumber);
    
    // Test 1 için özel kontrol
    if (testNumber === 1) {
      if (!user) {
        setEnergyError('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      if ((user.energy ?? 0) < 20) {
        setEnergyError('Bu testi çözmek için yeterli enerjiniz yok. (En az 20 enerji gerekir)');
        return;
      }
      
      // Test 1 tamamlanmışsa tekrar çözemez
      if (testStatus.status === 'completed') {
        setEnergyError('Bu testi zaten başarıyla tamamladınız! Bir sonraki testi çözebilirsiniz.');
        return;
      }
      
      // Enerji düşümü ve quiz'e yönlendirme
      const newEnergy = Math.max(0, (user.energy ?? 0) - 20);
      const now = new Date().toISOString();
      try {
        await updateUserEnergy(user.id, newEnergy, now);
        updateUser({ ...user, energy: newEnergy, lastEnergyUpdate: now });
        navigate(`/quiz/${mainTopic}/${subTopic}/${testNumber}`);
      } catch (err) {
        setEnergyError('Enerji güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
      return;
    }

    // Test 2 ve sonrası için kontrol
    if (testNumber > 1) {
      // Önceki test başarılı mı kontrol et
      if (!checkPreviousTestSuccess(testNumber)) {
        setEnergyError(`Bu testi açmak için önce Test ${testNumber - 1}'de en az %70 başarı sağlamanız gerekli.`);
        return;
      }

      // Test zaten açık mı kontrol et
      const isTestUnlocked = unlockedTests.includes(testNumber);
      
      if (isTestUnlocked) {
        // Test açık, direkt quiz sayfasına git
        if (!user) {
          setEnergyError('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
          return;
        }
        if ((user.energy ?? 0) < 20) {
          setEnergyError('Bu testi çözmek için yeterli enerjiniz yok. (En az 20 enerji gerekir)');
          return;
        }
        
        // Test tamamlanmışsa tekrar çözemez
        if (testStatus.status === 'completed') {
          setEnergyError('Bu testi zaten başarıyla tamamladınız! Bir sonraki testi çözebilirsiniz.');
          return;
        }
        
        // Enerji düşümü ve quiz'e yönlendirme
        const newEnergy = Math.max(0, (user.energy ?? 0) - 20);
        const now = new Date().toISOString();
        try {
          await updateUserEnergy(user.id, newEnergy, now);
          updateUser({ ...user, energy: newEnergy, lastEnergyUpdate: now });
          navigate(`/quiz/${mainTopic}/${subTopic}/${testNumber}`);
        } catch (err) {
          setEnergyError('Enerji güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
        return;
      } else {
        // Test kilitli - satın alma modalını göster
        if (!user) {
          setEnergyError('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
          return;
        }

        // Satın alma modalını göster
        setSelectedTest(testNumber);
        setShowUnlockModal(true);
        return;
      }
    }
  }, [user, mainTopic, subTopic, navigate, updateUser, getTestStatus, checkPreviousTestSuccess, unlockedTests]);

  // Optimize edilmiş confetti animasyonu - sadece gerekli olduğunda çalıştır
  const triggerConfetti = useCallback(() => {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    // Confetti sayısını azalt ve performansı artır
    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(confetti);
      
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.remove();
        }
      }, 3000);
    }
  }, []);

  // Test açma handler'ı - useCallback ile optimize et
  const handleUnlockTest = useCallback(async () => {
    if (!user || !selectedTest) return;

    setUnlockLoading(true);
    setUnlockMessage(null);

    try {
      // Önceki test başarılı mı kontrol et
      if (!checkPreviousTestSuccess(selectedTest)) {
        setUnlockMessage(`Bu testi açmak için önce Test ${selectedTest - 1}'de %70 başarı sağlamanız gerekli.`);
        return;
      }

      const testPrice = TEST_PRICES[selectedTest];
      if (!testPrice) {
        setUnlockMessage('Bu test için fiyat bilgisi bulunamadı.');
        return;
      }

      // Coin kontrolü
      if ((user.coins || 0) < testPrice) {
        setUnlockMessage('Yetersiz coin! Bu testi açmak için daha fazla coin gerekli.');
        return;
      }

      // Yeni unlockedTests objesi oluştur
      const currentUnlockedTests = user.unlockedTests || {};
      const currentTopicUnlockedTests = currentUnlockedTests[subjectTopicKey] || [];
      const updatedTopicUnlockedTests = [...currentTopicUnlockedTests, selectedTest];
      
      const updatedUnlockedTests = {
        ...currentUnlockedTests,
        [subjectTopicKey]: updatedTopicUnlockedTests
      };

      // Firestore'a kaydet
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          coins: increment(-testPrice),
          [`unlockedTests.${subjectTopicKey}`]: updatedTopicUnlockedTests
        });
      } catch (firestoreError) {
        setUnlockMessage('❌ Test açılırken bir hata oluştu. Lütfen tekrar deneyin.');
        return;
      }

      // Local user state'ini güncelle
      const updatedUser = { ...user };
      updatedUser.coins = (user.coins || 0) - testPrice;
      updatedUser.unlockedTests = updatedUnlockedTests;
      updateUser(updatedUser);
      
      // Firestore'dan güncel veriyi çek
      await refreshUser();

      setUnlockMessage('✅ Test başarıyla açıldı!');
      triggerConfetti(); // Confetti animasyonu
      setTimeout(async () => {
        setShowUnlockModal(false);
        setUnlockMessage(null);
        setSelectedTest(null);
        
        // Enerji kontrolü ve quiz sayfasına yönlendirme
        if (!user) {
          setEnergyError('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
          return;
        }
        if ((user.energy ?? 0) < 20) {
          setEnergyError('Bu testi çözmek için yeterli enerjiniz yok. (En az 20 enerji gerekir)');
          return;
        }
        
        // Enerji düşümü
        const newEnergy = Math.max(0, (user.energy ?? 0) - 20);
        const now = new Date().toISOString();
        try {
          await updateUserEnergy(user.id, newEnergy, now);
          updateUser({ ...user, energy: newEnergy, lastEnergyUpdate: now });
          navigate(`/quiz/${mainTopic}/${subTopic}/${selectedTest}`);
        } catch (err) {
          setEnergyError('Enerji güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
      }, 1500);

    } catch (error) {
      setUnlockMessage('❌ Test açılırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUnlockLoading(false);
    }
  }, [user, selectedTest, subjectTopicKey, checkPreviousTestSuccess, updateUser, refreshUser, triggerConfetti, navigate, mainTopic, subTopic]);

  // Modal kapatma handler'ı - useCallback ile optimize et
  const handleCloseModal = useCallback(() => {
    setShowUnlockModal(false);
    setSelectedTest(null);
    setUnlockMessage(null);
  }, []);

  // Test kartlarını useMemo ile optimize et
  const testCards = useMemo(() => {
    return Array.from({ length: TEST_COUNT }, (_, index) => {
      const testNumber = index + 1;
      const testStatus = getTestStatus(testNumber);
      
      // Test 2 ve sonrası için özel kontrol - eski sistemden kalan açık testleri temizle
      let isTestUnlocked = unlockedTests.includes(testNumber) || testNumber === 1;
      
      // Test 2 ve sonrası için coin sistemi kontrolü
      if (testNumber > 1) {
        // Test 2 ve sonrası için hem başarı şartı hem de coin gerekli
        const isPreviousTestSuccessful = checkPreviousTestSuccess(testNumber);
        
        // Eğer önceki test başarılı değilse, test kilitli
        if (!isPreviousTestSuccessful) {
          isTestUnlocked = false;
        }
        // Eğer önceki test başarılıysa ama test henüz satın alınmamışsa, kilitli
        else if (!unlockedTests.includes(testNumber)) {
          isTestUnlocked = false;
        }
      }
      
      const isLocked = testNumber > 1 && !isTestUnlocked;
      const testPrice = TEST_PRICES[testNumber];
      const isPreviousTestSuccessful = checkPreviousTestSuccess(testNumber);
      
      
      return (
        <TestCard
          key={testNumber}
          testNumber={testNumber}
          testStatus={testStatus}
          isTestUnlocked={isTestUnlocked}
          isLocked={isLocked}
          isPreviousTestSuccessful={isPreviousTestSuccessful}
          testPrice={testPrice}
          onClick={handleTestClick}
          animationDelay={index * 0.09}
        />
      );
    });
  }, [getTestStatus, unlockedTests, checkPreviousTestSuccess, handleTestClick, user?.coins]);

  // Cache performansını logla (development için)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        logCachePerformance();
      }, 2000); // 2 saniye sonra logla
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  // Early return - hooks'lardan sonra
  if (!mainTopic || !subTopic) {
    return (
      <div className="container">
        <div className="header"><h1>Test Seçimi</h1></div>
        <div className="card">
          <p style={{ color: 'red', fontWeight: 600, fontSize: 18 }}>Hatalı yönlendirme: Lütfen önce bir konu ve alt konu seçin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="test-selection-container">
      {/* Back Button */}
      <BackButton />
      
      {/* Optimize edilmiş Particle Background - mobilde devre dışı */}
      {!isMobile && (
        <div className="particle-background">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="particle" style={{ top: `${Math.random() * 100}%` }}></div>
          ))}
        </div>
      )}

      <div className="test-selection-content">
        {/* Header with Back Button */}
        <SubjectHeader 
          title={`${mainTopicLabels[mainTopic] || mainTopic} - ${getSubTopicLabel}`}
        />
        
        <div className="test-selection-header">
          <h1 className="test-selection-title">Aşağıdan bir test seçerek başlayabilirsin</h1>
          <p className="test-selection-subtitle">Testleri çözerek XP ve Coin kazanabilirsin</p>
        </div>

        {energyError && (
          <div className="error-message">{energyError}</div>
        )}
        
        <div className="test-grid">
          {testCards}
        </div>

        {/* Optimize edilmiş Unlock Modal */}
        <UnlockModal
          isOpen={showUnlockModal}
          selectedTest={selectedTest}
          unlockLoading={unlockLoading}
          unlockMessage={unlockMessage}
          userCoins={user?.coins || 0}
          checkPreviousTestSuccess={checkPreviousTestSuccess}
          onClose={handleCloseModal}
          onUnlock={handleUnlockTest}
        />

        {/* Confetti Animation Container */}
        <div id="confetti-container" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}></div>
      </div>
    </div>
  );
});

TestSelectionComponent.displayName = 'TestSelectionComponent';

const TestSelection: React.FC = () => {
  return (
    <TestSelectionErrorBoundary>
      <TestSelectionComponent />
    </TestSelectionErrorBoundary>
  );
};

export default TestSelection; 