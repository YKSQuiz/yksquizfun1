// Firebase servisleri - Ana export dosyası
// Not: Bu dosya firebase/ klasöründeki servislerle tekrar ediyor
// Gelecekte firebase/ klasöründeki servisler kullanılacak

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// Kullanıcı servisleri - firebase/user.ts'den import edilecek
export { updateSessionTime, updateUserEnergy } from './firebase/user';

export default app; 