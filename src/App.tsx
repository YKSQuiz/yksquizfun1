import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/features/auth';
import { useAuth } from './contexts/AuthContext';
import { App as CapacitorApp } from '@capacitor/app';
import ScrollToTop from './components/common/ScrollToTop';
import { useAndroidBackButton } from './hooks';
import { useOneSignal } from './hooks/useOneSignal';
import { initializeCacheManagement } from './utils/cacheManagement';
import { benchmarkFirestoreOptimization } from './utils/performanceTest';

// Optimized lazy loading with preloading for better performance
const Home = lazy(() => import('./components/features/home/Home'));
const SubjectSelector = lazy(() => import('./components/common/subjects/SubjectSelector'));
const AltKonuSelector = lazy(() => import('./components/common/subjects/AltKonuSelector'));
const TestSelection = lazy(() => import('./components/features/quiz/TestSelection'));
const Quiz = lazy(() => import('./components/features/quiz/Quiz'));
const EditProfile = lazy(() => import('./components/features/auth/EditProfile'));
const Istatistiklerim = lazy(() => import('./components/features/stats/Istatistiklerim'));
const PerformanceDashboard = lazy(() => import('./components/features/admin/PerformanceDashboard'));
const Market = lazy(() => import('./components/features/market/Market'));
const LeaderboardPage = lazy(() => import('./components/features/leaderboard/LeaderboardPage'));

// Preload critical components for better UX
const preloadComponents = () => {
  // Preload Home component after initial load
  setTimeout(() => {
    import('./components/features/home/Home');
  }, 1000);
  
  // Preload Quiz component after 2 seconds
  setTimeout(() => {
    import('./components/features/quiz/Quiz');
  }, 2000);
};

// Private Route Component
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

// URL Handler Component
const URLHandler: React.FC = () => {
  useEffect(() => {
    // Web için URL'den referans kodunu al
    const handleUrl = (url: URL) => {
      const refCode = url.searchParams.get('ref');
      console.log('🔗 URL kontrolü:', url.toString());
      console.log('🔗 Davet kodu:', refCode);
      if (refCode) {
        sessionStorage.setItem('referralCode', refCode);
        console.log('✅ Davet kodu sessionStorage\'a kaydedildi:', refCode);
      }
    };

    const currentUrl = new URL(window.location.toString());
    handleUrl(currentUrl);

    // Mobil için Deep Link'ten referans kodunu al
    CapacitorApp.addListener('appUrlOpen', (event) => {
      const deepLinkUrl = new URL(event.url);
      handleUrl(deepLinkUrl);
    });

    return () => {
      // Listener'ı temizle
      CapacitorApp.removeAllListeners();
    };
  }, []);

  return null;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  // Android geri tuşu yönetimi (sadece mobil ortamda)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isCapacitor = (window as any).Capacitor !== undefined;
  
  // Hook'u her zaman çağır, ama içinde kontrol et
  useAndroidBackButton();

  // Cache yönetimini başlat
  useEffect(() => {
    initializeCacheManagement({
      autoCleanupInterval: 5 * 60 * 1000, // 5 dakika
      maxCacheAge: 30 * 60 * 1000, // 30 dakika
      maxCacheSize: 100,
      enablePersistentCache: true,
      enableBatchProcessing: true
    });

    // Development modunda performans testlerini çalıştır
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        benchmarkFirestoreOptimization();
      }, 5000); // 5 saniye sonra test et
      
      return () => clearTimeout(timer);
    }

    // Cleanup fonksiyonu
    return () => {
      // Cache yönetimi otomatik olarak temizlenecek
    };
  }, []);

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        
        {/* TYT Ana Konular */}
        <Route path="/tyt-subjects" element={<PrivateRoute><SubjectSelector category="tyt" /></PrivateRoute>} />
        
        {/* TYT Alt Konular */}
        <Route path="/tyt-turkce-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-turkce" subjectName="TYT Türkçe" /></PrivateRoute>} />
        <Route path="/tyt-tarih-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-tarih" subjectName="TYT Tarih" /></PrivateRoute>} />
        <Route path="/tyt-cografya-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-cografya" subjectName="TYT Coğrafya" /></PrivateRoute>} />
        <Route path="/tyt-felsefe-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-felsefe" subjectName="TYT Felsefe" /></PrivateRoute>} />
        <Route path="/tyt-din-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-din" subjectName="TYT Din" /></PrivateRoute>} />
        <Route path="/tyt-matematik-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-matematik" subjectName="TYT Matematik" /></PrivateRoute>} />
        <Route path="/tyt-fizik-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-fizik" subjectName="TYT Fizik" /></PrivateRoute>} />
        <Route path="/tyt-kimya-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-kimya" subjectName="TYT Kimya" /></PrivateRoute>} />
        <Route path="/tyt-biyoloji-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="tyt-biyoloji" subjectName="TYT Biyoloji" /></PrivateRoute>} />
        
        {/* TYT Test Seçimi */}
        <Route path="/turkce/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/tarih/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/cografya/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/felsefe/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/din/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/matematik/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/fizik/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/kimya/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/biyoloji/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        
        {/* AYT Ana Konular */}
        <Route path="/ayt-say-subjects" element={<PrivateRoute><SubjectSelector category="ayt-sayisal" /></PrivateRoute>} />
        <Route path="/ayt-ea-subjects" element={<PrivateRoute><SubjectSelector category="ayt-ea" /></PrivateRoute>} />
        <Route path="/ayt-soz-subjects" element={<PrivateRoute><SubjectSelector category="ayt-sozel" /></PrivateRoute>} />
        
        {/* AYT Alt Konular */}
        <Route path="/ayt-matematik-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-matematik" subjectName="AYT Matematik" /></PrivateRoute>} />
        <Route path="/ayt-fizik-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-fizik" subjectName="AYT Fizik" /></PrivateRoute>} />
        <Route path="/ayt-kimya-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-kimya" subjectName="AYT Kimya" /></PrivateRoute>} />
        <Route path="/ayt-biyoloji-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-biyoloji" subjectName="AYT Biyoloji" /></PrivateRoute>} />
        <Route path="/ayt-edebiyat-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-edebiyat" subjectName="AYT Edebiyat" /></PrivateRoute>} />
        <Route path="/ayt-tarih-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-tarih" subjectName="AYT Tarih" /></PrivateRoute>} />
        <Route path="/ayt-cografya-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-cografya" subjectName="AYT Coğrafya" /></PrivateRoute>} />
        <Route path="/ayt-felsefe-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-felsefe" subjectName="AYT Felsefe" /></PrivateRoute>} />
        <Route path="/ayt-din-altkonular" element={<PrivateRoute><AltKonuSelector subjectId="ayt-din" subjectName="AYT Din Kültürü" /></PrivateRoute>} />
        
        {/* AYT Test Seçimi */}
        <Route path="/ayt-matematik/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-fizik/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-kimya/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-biyoloji/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-edebiyat/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-cografya/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-felsefe/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        <Route path="/ayt-din/:subTopic" element={<PrivateRoute><TestSelection /></PrivateRoute>} />
        
        {/* Quiz (TYT ve AYT ortak) */}
        <Route path="/quiz/:mainTopic/:subTopic/:testNumber" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        
        {/* Diğer Sayfalar */}
        <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        <Route path="/istatistikler" element={<PrivateRoute><Istatistiklerim /></PrivateRoute>} />
        <Route path="/performance" element={<PrivateRoute><PerformanceDashboard /></PrivateRoute>} />
        <Route path="/market" element={<PrivateRoute><Market /></PrivateRoute>} />
        <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  // OneSignal entegrasyonu
  useOneSignal('ec6a93b8-6aa2-4355-a5be-c4a0abf0af9f');
  
  // Preload critical components after app initialization
  useEffect(() => {
    preloadComponents();
  }, []);
  
  return (
    <Router>
      <URLHandler />
      <ScrollToTop />
      <Suspense fallback={
        <div className="loading-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            Yükleniyor...
          </div>
        </div>
      }>
        <AppRoutes />
      </Suspense>
    </Router>
  );
}

export default App; 