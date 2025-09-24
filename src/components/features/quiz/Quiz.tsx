import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { jokerKullan } from '../../../contexts/AuthContext';
import { altKonularConfigNew } from '../../../data/subjects/altKonularConfigNew';
import { GradientBackground } from '../../common/ui';
import './Quiz.css';
import { usePerformanceMonitor } from '../../../utils/performance';
import { useABTest } from '../../../utils/abTesting';
import confetti from 'canvas-confetti';
import { useSoundManager } from '../../../hooks/useSoundManager';
import SoundControl from './SoundControl';
import { firestoreCache } from '../../../utils/cacheManager';
import { logCachePerformance } from '../../../utils/cacheManager';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  testNumber: number;
  topicId: string;
}

const JOKER_TYPES = ["eliminate", "extraTime", "doubleAnswer", "autoCorrect"] as const;
type JokerType = typeof JOKER_TYPES[number];

const JOKER_ICONS = {
  eliminate: "➗",
  extraTime: "⏰",
  doubleAnswer: "2️⃣",
  autoCorrect: "✅",
};



const Quiz: React.FC = React.memo(() => {
  const { subTopic, testNumber } = useParams<{ subTopic: string; testNumber: string }>();
  const navigate = useNavigate();
  const { updateUserStats, user, updateUser, refreshUser } = useAuth();
  const { measureAsync, recordMetric } = usePerformanceMonitor();
  
  // AB Testing
  const { variant: uiVariant, config: uiConfig, trackEvent: trackUIEvent } = useABTest('quiz_ui_variant');
  const { variant: loadingVariant, config: loadingConfig, trackEvent: trackLoadingEvent } = useABTest('question_loading');

  // Ses yöneticisi
  const { playSound } = useSoundManager();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isDoubleAnswerActive, setIsDoubleAnswerActive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [quizDuration, setQuizDuration] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedCoin, setEarnedCoin] = useState(0);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [jokerPurchaseLoading, setJokerPurchaseLoading] = useState<string | null>(null);
  const [jokerPurchaseMessage, setJokerPurchaseMessage] = useState<string | null>(null);

  // Timer ref for optimization
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Questions cache with TTL for mobile optimization
  const questionsCache = useRef<Map<string, { data: Question[]; timestamp: number }>>(new Map());
  
  // Mobile detection for performance optimization
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Memoized values
  const progressPercentage = useMemo(() => 
    questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0,
    [currentQuestionIndex, questions.length]
  );

  const currentQuestion = useMemo(() => 
    questions[currentQuestionIndex] || null,
    [questions, currentQuestionIndex]
  );

  // Track quiz start
  useEffect(() => {
    trackUIEvent('quiz_started', { variant: uiVariant, config: uiConfig });
    trackLoadingEvent('quiz_started', { variant: loadingVariant, config: loadingConfig });
  }, [uiVariant, uiConfig, loadingVariant, loadingConfig, trackUIEvent, trackLoadingEvent]);

  useEffect(() => {
    const fetchQuestions = async () => {
      return measureAsync('fetchQuestions', async () => {
        try {
          setIsLoading(true);
          setError(null);

          const cacheKey = `${subTopic}-${testNumber}`;
          
          // Önce gelişmiş cache'den kontrol et
          const cachedQuestions = firestoreCache.getQuestions(subTopic || '', parseInt(testNumber || '1'));
          if (cachedQuestions) {
            console.log('📊 Quiz: Sorular gelişmiş cache\'den alındı');
            setQuestions(cachedQuestions);
            setIsLoading(false);
            recordMetric('cache_hit', 1);
            trackLoadingEvent('cache_hit', { cacheKey, source: 'advanced_cache' });
            return;
          }
          
          // Eski cache sistemini de kontrol et
          if (questionsCache.current.has(cacheKey)) {
            const cachedEntry = questionsCache.current.get(cacheKey)!;
            console.log('📊 Quiz: Sorular eski cache\'den alındı');
            setQuestions(cachedEntry.data);
            setIsLoading(false);
            recordMetric('cache_hit', 1);
            trackLoadingEvent('cache_hit', { cacheKey, source: 'legacy_cache' });
            return;
          }

          // Cache yoksa Firestore'dan çek
          console.log('📊 Quiz: Sorular Firestore\'dan çekiliyor');
          const questionsRef = collection(db, 'questions');
          const q = query(
            questionsRef,
            where('topicId', '==', subTopic),
            where('testNumber', '==', parseInt(testNumber || '1'))
          );
          
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            setError('Bu test için soru bulunamadı.');
            setIsLoading(false);
            return;
          }

          const fetchedQuestions: Question[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Question[];

          // Her iki cache sistemine de kaydet
          firestoreCache.setQuestions(subTopic || '', parseInt(testNumber || '1'), fetchedQuestions);
          
          // Enhanced cache with TTL for mobile optimization
          const cacheSize = loadingConfig.cacheSize || 50; // Increased cache size for mobile
          const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL
          
          const cacheEntry = {
            data: fetchedQuestions,
            timestamp: Date.now()
          };
          
          // Implement LRU cache strategy for mobile
          if (questionsCache.current.size >= cacheSize) {
            // Remove oldest entry
            const oldestKey = questionsCache.current.keys().next().value;
            if (oldestKey) {
              questionsCache.current.delete(oldestKey);
            }
          }
          
          questionsCache.current.set(cacheKey, cacheEntry);
          
          // Cleanup old cache entries periodically - Enhanced for mobile
          const now = Date.now();
          const keysToDelete: string[] = [];
          
          for (const [key, entry] of questionsCache.current.entries()) {
            if (now - entry.timestamp > CACHE_TTL) {
              keysToDelete.push(key);
            }
          }
          
          // Delete expired entries
          keysToDelete.forEach(key => {
            questionsCache.current.delete(key);
          });

          setQuestions(fetchedQuestions);
          setIsLoading(false);
          recordMetric('questions_loaded', fetchedQuestions.length);
          trackLoadingEvent('questions_loaded', { 
            count: fetchedQuestions.length,
            variant: loadingVariant 
          });
          
          // Quiz başlangıç sesi
          playSound('start');
        } catch (err) {
          console.error('Firebase hatası:', err);
          setError('Sorular yüklenirken bir hata oluştu.');
          setIsLoading(false);
          recordMetric('fetch_error', 1);
          trackLoadingEvent('fetch_error', { error: err });
        }
      });
    };

    if (subTopic && testNumber) {
      fetchQuestions();
    } else {
      setError('Geçersiz quiz parametreleri.');
      setIsLoading(false);
    }
  }, [subTopic, testNumber, measureAsync, recordMetric, trackLoadingEvent, loadingConfig, loadingVariant]);

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
  }, [refreshUser]);



  // Optimized timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isLoading && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else if (timeLeft === 0) {
      finishQuiz();
    }
    return undefined;
  }, [timeLeft, isLoading, questions.length]);

  // Format time display - memoized
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Optimized answer selection handler - memoized for mobile performance
  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (isAnswered) return;
    
    // Buton tıklama sesi - sadece mobilde değilse
    if (!isMobile) {
      playSound('click');
    }
    
    if (isDoubleAnswerActive) {
      if (selectedAnswers.includes(answerIndex)) return;
      const newSelected = [...selectedAnswers, answerIndex];
      setSelectedAnswers(newSelected);
      if (newSelected.length === 2) {
        setIsAnswered(true);
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion && currentQuestion.correctAnswer !== undefined && newSelected.includes(currentQuestion.correctAnswer)) {
          setScore(prev => prev + 1);
          // Doğru cevap sesi
          playSound('correct');
        } else {
          // Yanlış cevap sesi
          playSound('incorrect');
        }
      }
    } else {
      setSelectedAnswer(answerIndex);
      setIsAnswered(true);
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion && currentQuestion.correctAnswer !== undefined && answerIndex === currentQuestion.correctAnswer) {
        setScore(prev => prev + 1);
        // Doğru cevap sesi
        playSound('correct');
      } else {
        // Yanlış cevap sesi
        playSound('incorrect');
      }
    }
  }, [isAnswered, isDoubleAnswerActive, selectedAnswers, questions, currentQuestionIndex, playSound, isMobile]);

  // Test sonucu kaydetme fonksiyonu - Sıfırdan yazıldı
  const saveTestResult = async (finalScore: number, totalQuestions: number) => {
    if (!user || !subTopic || !testNumber) {
      console.error('❌ Test sonucu kaydedilemedi: Gerekli parametreler eksik');
      return;
    }

    try {
      // Konu anahtarı oluştur - Tüm dersler için ayrıntılı mapping
      const mainTopic = window.location.pathname.split('/')[1];
      let subjectTopicKey = `${mainTopic}_${subTopic}`;
      
      // TYT Dersleri için özel anahtar oluşturma - Tümü quiz_ prefix kullanır
      if (mainTopic === 'turkce') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'matematik') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'tarih') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'cografya') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'felsefe') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'din') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'fizik') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'kimya') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'biyoloji') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      // AYT Dersleri için özel anahtar oluşturma - Tümü quiz_ prefix kullanır
      if (mainTopic === 'ayt-matematik') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-fizik') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-kimya') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-biyoloji') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-edebiyat') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-tarih') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-cografya') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-felsefe') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
      if (mainTopic === 'ayt-din') {
        subjectTopicKey = `quiz_${subTopic}`;
      }
          
      const testId = testNumber;
      
      // Başarı hesaplama (7/10 = %70)
      const percentage = Math.round((finalScore / totalQuestions) * 100);
      const completed = finalScore >= 7; // 7 doğru kesin eşik



      // Yeni test sonucu
      const newTestResult = {
        score: finalScore,
        total: totalQuestions,
        percentage: percentage,
        completed: completed,
        attempts: 1
      };

      // Mevcut test sonuçlarını al
      const currentTestResults = user.testResults || {};
      const currentTopicResults = currentTestResults[subjectTopicKey] || {};
      
      // Eğer test daha önce çözülmüşse attempts'ı artır
      if (currentTopicResults[testId]) {
        newTestResult.attempts = (currentTopicResults[testId]?.attempts || 0) + 1;
      }

      // Test sonuçlarını güncelle
      const updatedTopicResults = {
        ...currentTopicResults,
        [testId]: newTestResult
      };

      const updatedTestResults = {
        ...currentTestResults,
        [subjectTopicKey]: updatedTopicResults
      };

      // Firestore'a kaydet (ana veri kaynağı)
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          testResults: updatedTestResults
        });
      } catch (firestoreError) {
        console.error('Firestore hatası (testResults):', firestoreError);
        throw new Error('Test sonucu kaydedilemedi');
      }

      // Local user state'ini güncelle
      updateUser({
        ...user,
        testResults: updatedTestResults
      });
    } catch (error) {
      console.error('Test sonucu kaydetme hatası:', error);
    }
  };

  // Finish quiz
  const finishQuiz = async (finalScore = score) => {
    try {
      setQuizDuration(600 - timeLeft);
      setShowStats(true);
      
      // Quiz bitirme sesi (başarılı/başarısız)
      const percentage = Math.round((finalScore / questions.length) * 100);
      if (percentage >= 70) {
        playSound('success');
      } else {
        playSound('fail');
      }
      
      // 1. Test sonuçlarını kaydet
      await saveTestResult(finalScore, questions.length);
      
      // 2. İstatistikleri merkezi fonksiyondan güncelle ve kazanılanları al
      const statsResult = await updateUserStats(
        finalScore,
        questions.length,
        600 - timeLeft // duration
      );

      if (statsResult) {
        setEarnedXp(statsResult.gainedXp);
        setEarnedCoin(statsResult.gainedCoin);
      }
      
      // Yönlendirme kaldırıldı, istatistik kartı gösterilecek
    } catch (err) {
      setError('İstatistikler kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  // Optimized next question handler
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setSelectedAnswers([]);
      setIsDoubleAnswerActive(false);
    } else {
      finishQuiz(score);
    }
  }, [currentQuestionIndex, questions.length, score, finishQuiz]);

  // Handle retry - aynı test sayfasına yönlendir
  const handleRetry = () => {
    if (subTopic && testNumber) {
      navigate(`/quiz/${window.location.pathname.split('/')[1]}/${subTopic}/${testNumber}`);
    } else {
      navigate(-1); // Eğer parametreler yoksa geri dön
    }
  };

  // Joker satın alma fiyatları
  const JOKER_PRICES: Record<JokerType, number> = {
    eliminate: 50,
    extraTime: 75,
    doubleAnswer: 100,
    autoCorrect: 150,
  };

  // Joker satın alma fonksiyonu
  const handleJokerPurchase = async (type: JokerType) => {
    if (!user) return;
    
    setJokerPurchaseLoading(type);
    setJokerPurchaseMessage(null);

    try {
      const price = JOKER_PRICES[type];
      
      // Coin kontrolü
      if ((user.coins || 0) < price) {
        setJokerPurchaseMessage('Yetersiz coin! Bu joker için daha fazla coin gerekli.');
        return;
      }

      // Joker miktar kontrolü
      const currentCount = user.jokers?.[type]?.count || 0;
      if (currentCount >= 3) {
        setJokerPurchaseMessage(`Bu jokerden zaten maksimum miktarda (3 adet) sahipsiniz!`);
        return;
      }

      const userRef = doc(db, 'users', user.id);
      const updates: any = {
        coins: increment(-price),
        [`jokers.${type}.count`]: increment(1)
      };

      await updateDoc(userRef, updates);

      // Local user state'ini güncelle
      const updatedUser = { ...user };
      updatedUser.coins = (user.coins || 0) - price;
      updatedUser.jokers = { ...user.jokers };
      updatedUser.jokers[type].count = Math.min(currentCount + 1, 3);
      updateUser(updatedUser);

      setJokerPurchaseMessage('✅ Joker başarıyla satın alındı!');
      setTimeout(() => setJokerPurchaseMessage(null), 2000);

    } catch (error) {
      console.error('Joker satın alma hatası:', error);
      setJokerPurchaseMessage('❌ Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setJokerPurchaseLoading(null);
    }
  };

  // Joker kullanımı
  const handleUseJoker = async (type: JokerType) => {
    if (!user || !user.jokers || !user.jokersUsed) return;
    try {
      // Joker kullanım sesi
      playSound('joker');
      
      const { newJokers, newJokersUsed } = await jokerKullan(
        user.id,
        user.jokers,
        user.jokersUsed,
        type
      );
      updateUser({ ...user, jokers: newJokers, jokersUsed: newJokersUsed });
      if (refreshUser) refreshUser();
      if (type === 'eliminate') {
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ) return;
        const wrongOptions = [0,1,2,3].filter(i => i !== currentQ.correctAnswer);
        const shuffled = wrongOptions.sort(() => Math.random() - 0.5);
        setEliminatedOptions(shuffled.slice(0,2));
      }
      if (type === 'extraTime') {
        setTimeLeft(prev => prev + 60);
      }
      if (type === 'doubleAnswer') {
        setIsDoubleAnswerActive(true);
        setSelectedAnswers([]);
      }
      if (type === 'autoCorrect') {
        setSelectedAnswer(questions[currentQuestionIndex]?.correctAnswer || 0);
        setIsAnswered(true);
        setScore(prev => prev + 1);
        // Auto correct doğru cevap sesi
        playSound('correct');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Soru değiştiğinde joker state'lerini sıfırla
  useEffect(() => {
    setEliminatedOptions([]);
    setIsDoubleAnswerActive(false);
    setSelectedAnswers([]);
  }, [currentQuestionIndex]);

  // Mobile detection function - removed duplicate

  useEffect(() => {
    if (showStats) {
      const successRate = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      if (successRate >= 70 && !isMobile) { // Disable confetti on mobile for performance
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 60, // Reduced from 120 for better performance
            spread: 60, // Reduced from 80
            origin: { y: 0.6 },
            zIndex: 9999
          });
        }
      }
    }
    // eslint-disable-next-line
  }, [showStats]);

  if (isLoading) {
    return (
      <div className="quiz-container">
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <p>Quiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-container">
        <div className="quiz-error">
          <div className="error-icon">⚠️</div>
          <h2>Hata</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="retry-button">
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-error">
          <div className="error-icon">📝</div>
          <h2>Soru Bulunamadı</h2>
          <p>Bu test için henüz soru eklenmemiş.</p>
        </div>
      </div>
    );
  }

  if (showStats) {
    const successRate = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const isSuccessful = score >= 7; // 7 doğru kesin eşik
    
    return (
      <div className="quiz-container">
        <div className="quiz-stats-card animated-stats-card"
          style={{
            maxWidth: 540,
            margin: '64px auto',
            background: 'linear-gradient(120deg, #f8fafc 0%, #e0c3fc 100%)',
            borderRadius: 40,
            boxShadow: '0 12px 48px #764ba244, 0 2px 12px #fff8',
            padding: 48,
            textAlign: 'center',
            position: 'relative',
            minHeight: 440,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'popInStats 1.1s cubic-bezier(.39,.575,.56,1.000)'
          }}>
          <h2 style={{color: '#764ba2', fontWeight: 900, marginBottom: 24, fontSize: 34, letterSpacing: 1}}>🎉 Quiz Sonuçları 🎉</h2>
          
          {/* Başarı Durumu Mesajı */}
          <div style={{
            padding: '16px 24px',
            borderRadius: 16,
            marginBottom: 24,
            fontWeight: 800,
            fontSize: 20,
            background: isSuccessful 
              ? 'linear-gradient(90deg, #d4edda 0%, #c3e6cb 100%)'
              : 'linear-gradient(90deg, #f8d7da 0%, #f5c6cb 100%)',
            color: isSuccessful ? '#155724' : '#721c24',
            border: `3px solid ${isSuccessful ? '#28a745' : '#dc3545'}`,
            boxShadow: `0 4px 16px ${isSuccessful ? '#28a74533' : '#dc354533'}`
          }}>
            {isSuccessful ? (
              <>
                <span style={{ fontSize: 24, marginRight: 8 }}>✅</span>
                Başarı Sağlandı! (%{successRate})
              </>
            ) : (
              <>
                <span style={{ fontSize: 24, marginRight: 8 }}>❌</span>
                Başarı Sağlanamadı! (%{successRate})
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 28 }}>
            {/* XP Kutusu */}
            <div style={{
              background: 'linear-gradient(90deg, #f59e42 0%, #ffe082 100%)',
              borderRadius: 18,
              boxShadow: '0 2px 12px #f59e4255',
              padding: '18px 32px',
              fontWeight: 900,
              fontSize: 28,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 120,
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 36, marginRight: 6 }}>⭐</span>
              <span style={{ fontSize: 32 }}>{earnedXp}</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#fffbe7', marginLeft: 6 }}>XP</span>
            </div>
            {/* Coin Kutusu */}
            <div style={{
              background: 'linear-gradient(90deg, #ffe082 0%, #ffd54f 100%)',
              borderRadius: 18,
              boxShadow: '0 2px 12px #ffecb355',
              padding: '18px 32px',
              fontWeight: 900,
              fontSize: 28,
              color: '#ffb300',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 120,
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 36, marginRight: 6 }}>🪙</span>
              <span style={{ fontSize: 32, color: '#ffb300' }}>{earnedCoin}</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#bfa040', marginLeft: 6 }}>coin</span>
            </div>
          </div>
          <div style={{fontSize: 26, fontWeight: 800, marginBottom: 18}}>
            Doğru: <span style={{color: '#22c55e'}}>{score}</span> / Yanlış: <span style={{color: '#ef4444'}}>{questions.length - score}</span>
          </div>
          <div style={{fontSize: 22, marginBottom: 10}}>Başarı Oranı: <b style={{color: '#2563eb'}}>{successRate}%</b></div>
          <div style={{fontSize: 22, marginBottom: 10}}>Toplam Süre: <b style={{color: '#7c3aed'}}>{formatTime(quizDuration)}</b></div>
          
          {/* Yönlendirme Butonları */}
          <div style={{ display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {isSuccessful ? (
              // Başarı sağlandıysa - Test seçim sayfasına dön
              <button 
                onClick={() => navigate(-1)} 
                style={{
                  padding: '16px 44px', 
                  background: 'linear-gradient(90deg,#28a745,#20c997)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 16, 
                  fontWeight: 800, 
                  fontSize: 22, 
                  cursor: 'pointer', 
                  boxShadow: '0 6px 24px #28a74544', 
                  letterSpacing: 1
                }}
              >
                ✅ Testi Seçimine Dön
              </button>
            ) : (
              // Başarı sağlanamadıysa - Test seçim ekranına dön
              <button 
                onClick={() => navigate(-1)} 
                style={{
                  padding: '16px 44px', 
                  background: 'linear-gradient(90deg,#dc3545,#fd7e14)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 16, 
                  fontWeight: 800, 
                  fontSize: 22, 
                  cursor: 'pointer', 
                  boxShadow: '0 6px 24px #dc354544', 
                  letterSpacing: 1
                }}
              >
                🔄 Test Seçimine Dön
              </button>
            )}
            
            <button 
              onClick={() => navigate('/')} 
              style={{
                padding: '16px 44px', 
                background: 'linear-gradient(90deg,#667eea,#764ba2)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 16, 
                fontWeight: 800, 
                fontSize: 22, 
                cursor: 'pointer', 
                boxShadow: '0 6px 24px #764ba244', 
                letterSpacing: 1
              }}
            >
              🏠 Ana Sayfaya Dön
            </button>
          </div>
          <div style={{marginTop: 28}}>
            <button onClick={() => setShowXpInfo(v => !v)} style={{background: 'none', border: '2px solid #764ba2', color: '#764ba2', borderRadius: 10, padding: '8px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 17, marginBottom: 8, transition: 'all 0.2s'}}>
              XP Kazanma Kuralları {showXpInfo ? '▲' : '▼'}
            </button>
            {showXpInfo && (
              <div style={{
                fontSize: 17,
                color: '#333',
                marginTop: 8,
                background: 'linear-gradient(120deg, #fffbe7 0%, #e0c3fc22 100%)',
                borderRadius: 14,
                padding: 18,
                textAlign: 'left',
                boxShadow: '0 2px 12px #764ba211',
                fontWeight: 500,
                border: '1.5px solid #ffe082',
                maxWidth: 340,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}>
                <div style={{ fontWeight: 900, fontSize: 19, color: '#a084ee', marginBottom: 10, textAlign: 'center', letterSpacing: 1 }}>
                  XP & Coin Kazanma Kuralları
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>✅</span>
                    <span>Her doğru cevap: <b style={{ color: '#f59e42' }}>+20 XP</b> <span style={{ color: '#bfa040', fontWeight: 700 }}>ve</span> <b style={{ color: '#ffb300' }}>+20 coin</b></span>
                  </li>
                  <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>🏆</span>
                    <span>%100 başarı: <b style={{ color: '#f59e42' }}>2 katı XP</b> <span style={{ color: '#bfa040', fontWeight: 700 }}>ve</span> <b style={{ color: '#ffb300' }}>2 katı coin</b></span>
                  </li>
                  <li style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>👍</span>
                    <span>%70 ve üzeri başarı: <b style={{ color: '#f59e42' }}>Standart XP</b> <span style={{ color: '#bfa040', fontWeight: 700 }}>ve</span> <b style={{ color: '#ffb300' }}>standart coin</b></span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>🟠</span>
                    <span>Daha düşük başarı: <b style={{ color: '#f59e42' }}>Yarı XP</b> <span style={{ color: '#bfa040', fontWeight: 700 }}>ve</span> <b style={{ color: '#ffb300' }}>yarı coin</b></span>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <style>{`
            @keyframes popInStats {
              0% { opacity: 0; transform: scale(0.7) translateY(60px); }
              60% { opacity: 1; transform: scale(1.08) translateY(-8px); }
              80% { transform: scale(0.98) translateY(4px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <GradientBackground variant="quiz" showParticles={true} particleCount={12}>
      <div className="quiz-container">
      <div className="quiz-card">


        {user && user.jokers && user.jokersUsed && (
          <>
            {/* Alt Konu Başlık Kartı */}
            <div className="quiz-subtopic-card">
              <h2 className="quiz-subtopic-title">
                {(() => {
                  if (!subTopic) return 'Quiz';
                  try {
                    const id = decodeURIComponent(subTopic);
                    for (const altList of Object.values(altKonularConfigNew)) {
                      const found = altList.find(ak => ak.id === id);
                      if (found) return found.label;
                    }
                    return id;
                  } catch {
                    return subTopic;
                  }
                })()}
              </h2>
              {testNumber && (
                <div className="quiz-subtopic-test-number">Test {testNumber}</div>
              )}
            </div>
            
            <div className="joker-panel-container">
            {JOKER_TYPES.map((type) => {
              const jokerCount = user.jokers[type].count;
              const isDisabled = jokerCount === 0;
              const price = JOKER_PRICES[type];
              
              return (
                <div
                  key={type}
                  className={`joker-emoji-box ${isDisabled ? 'disabled' : ''}`}
                  style={{
                    minWidth: 0,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isDisabled ? 0.6 : 1,
                    cursor: isDisabled ? 'pointer' : 'pointer',
                    position: 'relative',
                  }}
                  title={`${type === 'eliminate' ? '2 Şık Eleme' : 
                          type === 'extraTime' ? 'Ekstra 60sn' :
                          type === 'doubleAnswer' ? 'Çift Cevap' : 'Doğru Kabul'}`}
                  onClick={e => {
                    if (isDisabled) {
                      // Joker bittiğinde satın alma
                      handleJokerPurchase(type);
                    } else {
                      // Joker kullanma
                      if (type !== 'autoCorrect') {
                        const el = e.currentTarget;
                        if (el && el.classList) {
                          el.classList.add('joker-emoji-clicked');
                          setTimeout(() => {
                            if (el && el.classList) el.classList.remove('joker-emoji-clicked');
                          }, 400);
                        }
                        handleUseJoker(type);
                      } else {
                        handleUseJoker(type);
                      }
                    }
                  }}
                >
                  <div className="joker-icon-square">
                    <span
                      className="joker-emoji"
                      style={{ 
                        filter: isDisabled ? 'grayscale(1)' : 'none'
                      }}
                    >
                      {JOKER_ICONS[type]}
                    </span>
                  </div>
                  
                  {isDisabled ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <span style={{ 
                        fontSize: 12, 
                        color: '#ffb300', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        <span style={{ fontSize: 10 }}>🪙</span>
                        {price}
                      </span>
                      <span style={{ 
                        fontSize: 10, 
                        color: '#999', 
                        textAlign: 'center',
                        lineHeight: 1.2
                      }}>
                        {jokerPurchaseLoading === type ? 'Yükleniyor...' : 'Satın Al'}
                      </span>
                    </div>
                  ) : (
                    // Normal joker sayısı göster
                    <>
                      <span style={{ 
                        fontSize: 16, 
                        color: '#764ba2', 
                        fontWeight: 700, 
                        marginBottom: 2 
                      }}>
                        {jokerCount}
                      </span>
                      {/* Kullanıldı bilgisi kaldırıldı */}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
        )}
        
        {jokerPurchaseMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            borderRadius: '12px',
            background: jokerPurchaseMessage.includes('✅') ? '#d4edda' : '#f8d7da',
            color: jokerPurchaseMessage.includes('✅') ? '#155724' : '#721c24',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: `2px solid ${jokerPurchaseMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {jokerPurchaseMessage}
          </div>
        )}
        <div className="quiz-header">
          <div className="quiz-status-card">
            <div className="quiz-header-top">
              <div className="quiz-status-title">
                {/* Başlık kaldırıldı */}
              </div>
            </div>
            <div className="quiz-status-row">
              <div className="quiz-chip">
                <span>Doğru:</span>
                <b style={{ color: '#22c55e' }}>{score}</b>
                <span className="quiz-chip-sep">/</span>
                <span>Yanlış:</span>
                <b style={{ color: '#ef4444' }}>{currentQuestionIndex - score >= 0 ? currentQuestionIndex - score : 0}</b>
              </div>
              <div className="quiz-chip">
                <span style={{ fontSize: 18 }}>⏱️</span>
                <b>{formatTime(timeLeft)}</b>
              </div>
              <div className="quiz-chip muted">
                <span>Soru</span>
                <b>{currentQuestionIndex + 1}</b>
                <span>/</span>
                <span>{questions.length}</span>
              </div>
              <SoundControl />
            </div>
          </div>
        </div>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="question-section">
          <div className="question-number">
            Soru {currentQuestionIndex + 1}
          </div>
          <div className="question-text">
            {currentQuestion?.question || 'Soru yükleniyor...'}
          </div>
        </div>
        <div className="answer-options">
          {currentQuestion?.options?.map((option, index) => (
            <button
              key={index}
              className={`answer-button ${
                isDoubleAnswerActive
                  ? selectedAnswers.includes(index)
                    ? (index === currentQuestion.correctAnswer ? 'correct' : 'incorrect')
                    : ''
                  : selectedAnswer === index
                    ? index === currentQuestion.correctAnswer
                      ? 'correct'
                      : 'incorrect'
                    : ''
              } ${isAnswered && index === currentQuestion.correctAnswer ? 'correct' : ''} ${
                eliminatedOptions.includes(index) ? 'eliminated' : ''
              }`}
              onClick={() => handleAnswerSelect(index)}
              disabled={isAnswered}
            >
              <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
              <span className="answer-text">{option}</span>
            </button>
          ))}
        </div>
        {isAnswered && currentQuestion?.explanation && (
          <div className="explanation">
            <h4>Açıklama:</h4>
            <p>{currentQuestion.explanation}</p>
          </div>
        )}
        <div className="quiz-navigation">
          <button
            className="next-button"
            onClick={handleNextQuestion}
            disabled={!isAnswered}
          >
            {currentQuestionIndex < questions.length - 1 ? 'Sonraki Soru' : 'Quiz\'i Bitir'}
          </button>
        </div>
      </div>
    </div>
    </GradientBackground>
  );
});

Quiz.displayName = 'Quiz';

// Cache performansını logla (development için)
const logCachePerformanceEffect = () => {
  if (process.env.NODE_ENV === 'development') {
    const timer = setTimeout(() => {
      logCachePerformance();
    }, 3000); // 3 saniye sonra logla
    
    return () => clearTimeout(timer);
  }
  return undefined;
};

export default Quiz;