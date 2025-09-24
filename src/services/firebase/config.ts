import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ GÜVENLİ: Environment variables kullanılıyor
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Environment variables kontrolü
if (!firebaseConfig.apiKey) {
  console.error('❌ Firebase API key bulunamadı!');
  console.error('📋 Kontrol edilecekler:');
  console.error('   1. .env.local dosyası var mı?');
  console.error('   2. REACT_APP_FIREBASE_API_KEY tanımlı mı?');
  console.error('   3. Development server yeniden başlatıldı mı?');
  
  // Production'da environment variables zorunlu
  throw new Error('Firebase API key bulunamadı. .env.local dosyasını kontrol edin.');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 30 günlük oturum süresi ayarla
setPersistence(auth, browserLocalPersistence);

// ✅ GÜVENLİ: Debug logları sadece development'ta
if (process.env.NODE_ENV === 'development') {
  console.log('🔥 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    currentDomain: window.location.hostname,
    isLocalhost: window.location.hostname === 'localhost',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isAndroid: /Android/.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/.test(navigator.userAgent),
    isMobile: /Android|iPhone|iPad|iPod/.test(navigator.userAgent),
    isWebView: /wv/.test(navigator.userAgent),
    isCapacitor: (window as any).Capacitor !== undefined,
    timestamp: new Date().toISOString()
  });
} else {
  // Production'da hassas bilgileri loglamayın
  console.log('🔥 Firebase başlatıldı (Production mode)');
}

// User Agent kontrolü ve düzeltmesi
if (typeof navigator !== 'undefined' && navigator.userAgent) {
  // WebView user agent'ını düzelt
  if (/wv/.test(navigator.userAgent)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 WebView tespit edildi, User Agent düzeltiliyor...');
    }
    // User Agent'ı Chrome'a benzet
    Object.defineProperty(navigator, 'userAgent', {
      get: function () {
        return 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
      },
      configurable: true
    });
  }
}

// ✅ GÜVENLİ: Android Studio emulator kontrolü (sadece development'ta)
if (process.env.NODE_ENV === 'development' && 
    (window.location.hostname === '10.0.2.2' || window.location.hostname === 'localhost')) {
  console.log('⚠️ Android Studio Emulator tespit edildi!');
  console.log('📋 Firebase Console\'da şu domainleri yetkilendirin:');
  console.log('   - localhost');
  console.log('   - 10.0.2.2');
  console.log('   - 127.0.0.1');
  console.log('   - Yerel IP adresiniz (192.168.x.x)');
}

export default app; 