import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db, updateSessionTime } from '../services/firebase';
import { firestoreCache } from '../utils/cacheManager';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Jokers, JokersUsed, User } from '../types';

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
    OneSignal?: any;
  }
}

// OneSignal ile kullanıcıyı eşitle ve cihaz bilgisini Firestore'a yaz
const syncOneSignalForUser = async (uid: string) => {
  try {
    const os = window.plugins?.OneSignal || window.OneSignal;
    if (!os) return;

    if (typeof os.login === 'function') {
      os.login(uid);
    } else if (typeof os.setExternalUserId === 'function') {
      os.setExternalUserId(uid);
    }

    if (typeof os.getDeviceState === 'function') {
      os.getDeviceState(async (state: any) => {
        try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
            'push.enabled': !!(state?.isSubscribed ?? true),
            'push.oneSignal.userId': state?.userId || null,
            'push.oneSignal.pushToken': state?.pushToken || null,
            'push.lastUpdated': serverTimestamp(),
          });
          console.log('[OneSignal] Firestore push kaydı güncellendi', state);
        } catch (e) {
          console.error('[OneSignal] Firestore push kaydı güncellenemedi', e);
        }
      });
    }
  } catch (e) {
    console.error('[OneSignal] syncOneSignalForUser hata', e);
  }
};

// Davet kodu oluşturma fonksiyonu
const generateReferralCode = (uid: string): string => {
  return ('REF' + uid.substring(0, 5) + Date.now().toString(36).slice(-4)).toUpperCase();
};

// Davet kodu ile kullanıcıyı bulan yardımcı fonksiyon
const findUserByReferralCode = async (code: string): Promise<User | null> => {
  console.log(`🔍 findUserByReferralCode çağrıldı: ${code}`);
  
  try {
    const usersRef = collection(db, 'users');
    console.log('📊 Firestore collection referansı alındı');
    
    const q = query(usersRef, where('referral.code', '==', code));
    console.log('🔍 Firestore sorgusu oluşturuldu');
    
    const querySnapshot = await getDocs(q);
    console.log(`📊 Sorgu sonucu: ${querySnapshot.size} kullanıcı bulundu`);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data() as User;
      userData.id = querySnapshot.docs[0].id;
      console.log(`✅ Kullanıcı bulundu: ${userData.displayName} (${userData.id})`);
      return userData;
    } else {
      console.log('❌ Bu referral kodu ile kullanıcı bulunamadı');
      return null;
    }
  } catch (error) {
    console.error('❌ findUserByReferralCode hatası:', error);
    throw error;
  }
};

// Domain kontrolü ve Android Studio için özel ayarlar
const checkDomainAndSetup = () => {
  const currentDomain = window.location.hostname;
  const isAndroidStudio = currentDomain === '10.0.2.2' || currentDomain === 'localhost';
  const isEmulator = /Android/.test(navigator.userAgent) && (currentDomain === '10.0.2.2' || currentDomain === 'localhost');
  
  console.log('🌐 Domain kontrolü:', {
    currentDomain,
    isAndroidStudio,
    isEmulator,
    userAgent: navigator.userAgent,
    isCapacitor: (window as any).Capacitor !== undefined
  });
  
  if (isEmulator) {
    console.log('📱 Android Studio Emulator tespit edildi');
    console.log('⚠️ Firebase Console\'da domain yetkilendirmesi gerekli!');
  }
  
  return { isAndroidStudio, isEmulator };
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;

  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUserStats: (correct: number, total: number, duration?: number) => Promise<{ gainedXp: number; gainedCoin: number } | void>;
  clearUserStats: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<void>;
  manualResetJokers: () => Promise<void>;
  getTestResults: (subjectTopicKey: string) => any;
  getUnlockedTests: (subjectTopicKey: string) => number[];
  resetPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Rütbe listesi
const RANKS = [
  { level: 1, name: "Soru Çömezi" },
  { level: 5, name: "Cevap Bilmecesi" },
  { level: 10, name: "Meraklı Beyin" },
  { level: 15, name: "Son Dakika Kahramanı" },
  { level: 20, name: "Şıkka Göz Kırpan" },
  { level: 25, name: "Tabloyla Kavgalı" },
  { level: 30, name: "Joker Sevdalısı" },
  { level: 35, name: "Kantin Filozofu" },
  { level: 40, name: "Ezber Bozan" },
  { level: 45, name: "Doğru Şık Dedektifi" },
  { level: 50, name: "Quiz Müptelası" },
  { level: 55, name: "Yanıt Ustası" },
  { level: 60, name: "Zihin Cambazı" },
  { level: 65, name: "Cevap Koleksiyoncusu" },
  { level: 70, name: "Sınav Samurayı" },
  { level: 75, name: "Zihin Hacker'ı" },
  { level: 80, name: "Soru Panteri" },
  { level: 85, name: "Zeka Juggleri" },
  { level: 90, name: "Quiz Rockstar'ı" },
  { level: 95, name: "Sonsuz Bilge" },
  { level: 100, name: "Quiz'in Efsanevi Patronu" }
];

// Seviye için gereken XP formülü
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let xp = 0;
  for (let i = 1; i < level; i++) {
    xp += Math.floor(100 * Math.pow(1.5, i - 1));
  }
  return xp;
}

// Seviyeye göre rütbe bulma
export function getRankForLevel(level: number): string {
  if (RANKS.length === 0) return "Bilinmeyen";
  
  let rank = RANKS[0]!.name;
  for (const r of RANKS) {
    if (level >= r.level) {
      rank = r.name;
    } else {
      break;
    }
  }
  return rank;
}

// Jokerleri sıfırlayan fonksiyon
export async function resetDailyJokers(userId: string, userJokers: Jokers) {
  const today = new Date().toISOString().slice(0, 10);
  let needsReset = false;
  const newJokers: Jokers = { ...userJokers };
  Object.keys(newJokers).forEach((key) => {
    if (newJokers[key as keyof Jokers].lastReset !== today) {
      newJokers[key as keyof Jokers] = { count: 3, lastReset: today };
      needsReset = true;
    }
  });
  if (needsReset) {
    await updateDoc(doc(db, 'users', userId), { jokers: newJokers });
  }
  return newJokers;
}

// Joker kullanan fonksiyon
export async function jokerKullan(
  userId: string,
  userJokers: Jokers,
  userJokersUsed: JokersUsed,
  type: keyof Jokers
) {
  if (userJokers[type].count <= 0) throw new Error('Joker hakkı yok!');
  const today = new Date().toISOString().slice(0, 10);
  const newJokers = {
    ...userJokers,
    [type]: {
      count: userJokers[type].count - 1,
      lastReset: today,
    },
  };
  const newJokersUsed = {
    ...userJokersUsed,
    [type]: (userJokersUsed[type] || 0) + 1,
  };
  await updateDoc(doc(db, 'users', userId), {
    jokers: newJokers,
    jokersUsed: newJokersUsed,
  });
  return { newJokers, newJokersUsed };
}

// Varsayılan joker yapısı
const getDefaultJokers = () => ({
  eliminate: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
  extraTime: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
  doubleAnswer: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
  autoCorrect: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
});

// Varsayılan joker kullanım yapısı
const getDefaultJokersUsed = () => ({
  eliminate: 0,
  extraTime: 0,
  doubleAnswer: 0,
  autoCorrect: 0,
});

// Varsayılan stats yapısı
const getDefaultStats = () => ({
  totalQuizzes: 0,
  correctAnswers: 0,
  totalQuestions: 0,
  dailyActivity: {},
  level: 1,
  experience: 0,
  experienceToNext: 100,
  totalSessionTime: 0
});

const getUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
  console.log('👤 Kullanıcı profili alınıyor...');
  console.log('   - User ID:', firebaseUser.uid);
  console.log('   - Email:', firebaseUser.email);
  
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    console.log('📊 Firestore referansı oluşturuldu');
    
    const userSnap = await getDoc(userRef);
    console.log('📊 Firestore sorgusu tamamlandı');
    
    if (userSnap.exists()) {
      console.log('✅ Kullanıcı profili Firestore\'dan alındı');
      const userData = userSnap.data() as User;
      let needsUpdate = false;
      const updates: Partial<User> = {};
      
      // Joker alanları kontrol et
      if (!userData.jokers) {
        userData.jokers = getDefaultJokers();
        updates.jokers = userData.jokers;
        needsUpdate = true;
      }
      if (!userData.jokersUsed) {
        userData.jokersUsed = getDefaultJokersUsed();
        updates.jokersUsed = userData.jokersUsed;
        needsUpdate = true;
      }
      
      // Enerji alanları kontrol et
      if (typeof userData.energy !== 'number') {
        userData.energy = 100;
        updates.energy = userData.energy;
        needsUpdate = true;
      }
      if (!userData.lastEnergyUpdate) {
        userData.lastEnergyUpdate = new Date().toISOString();
        updates.lastEnergyUpdate = userData.lastEnergyUpdate;
        needsUpdate = true;
      }
      if (typeof userData.energyLimit !== 'number') {
        userData.energyLimit = 100;
        updates.energyLimit = userData.energyLimit;
        needsUpdate = true;
      }
      if (typeof userData.energyRegenSpeed !== 'number') {
        userData.energyRegenSpeed = 300; // 5 dakika
        updates.energyRegenSpeed = userData.energyRegenSpeed;
        needsUpdate = true;
      }
      
      // Coin alanı kontrol et
      if (typeof userData.coins !== 'number') {
        userData.coins = 2000;
        updates.coins = userData.coins;
        needsUpdate = true;
      }
      
      // Açılan testler alanı kontrol et
      if (!userData.unlockedTests || typeof userData.unlockedTests !== 'object' || Array.isArray(userData.unlockedTests)) {
        userData.unlockedTests = {};
        updates.unlockedTests = userData.unlockedTests;
        needsUpdate = true;
      }
      
      // YENİ: Mevcut kullanıcılar için referral alanı kontrolü
      if (!userData.referral || !userData.referral.code) {
        const currentMonthKey = new Date().toISOString().slice(0, 7);
        userData.referral = {
          code: generateReferralCode(firebaseUser.uid),
          invitedBy: userData.referral?.invitedBy || null,
          allTimeInvites: userData.referral?.allTimeInvites || 0,
          monthlyInvites: userData.referral?.monthlyInvites || { [currentMonthKey]: 0 }
        };
        updates.referral = userData.referral;
        needsUpdate = true;
      }
      
             if (needsUpdate) {
         console.log('📝 Kullanıcı profili güncelleniyor...');
         try {
           await updateDoc(userRef, updates);
           console.log('✅ Kullanıcı profili güncellendi');
         } catch (updateError) {
           console.error('❌ Profil güncelleme başarısız:', updateError);
           throw updateError;
         }
       }
      return userData;
    } else {
      console.log('📝 Yeni kullanıcı profili oluşturuluyor...');
      // Yeni kullanıcı için Firestore'da profil oluştur
      const newUser: User = {
        id: firebaseUser.uid,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı',
        email: firebaseUser.email || '',
        avatar: firebaseUser.displayName ? firebaseUser.displayName[0]?.toUpperCase() || 'K' : (firebaseUser.email ? firebaseUser.email[0]?.toUpperCase() || 'K' : 'K'),
        stats: getDefaultStats(),
        jokers: getDefaultJokers(),
        jokersUsed: getDefaultJokersUsed(),
        energy: 100,
        lastEnergyUpdate: new Date().toISOString(),
        energyLimit: 100,
        energyRegenSpeed: 300, // 5 dakika
        coins: 2000,
        unlockedTests: {},
        referral: {
          code: generateReferralCode(firebaseUser.uid),
          invitedBy: null,
          allTimeInvites: 0,
          monthlyInvites: {
            [new Date().toISOString().slice(0, 7)]: 0
          }
        }
      };
      
             try {
         await setDoc(userRef, newUser, { merge: true });
         console.log('✅ Yeni kullanıcı profili oluşturuldu');
       } catch (createError) {
         console.error('❌ Profil oluşturma başarısız:', createError);
         throw createError;
       }
       return newUser;
    }
     } catch (error: any) {
     console.error('❌ Firestore bağlantı hatası:', error);
     console.error('   - Hata kodu:', error.code);
     console.error('   - Hata mesajı:', error.message);
     
     // Firebase Console'da domain yetkilendirmesi gerekli
     throw new Error('Firestore bağlantısı başarısız. Firebase Console\'da domain yetkilendirmesi yapın.');
   }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionStartRef = React.useRef<number | null>(null);
  const sessionAccumulatedRef = React.useRef<number>(0);
  const sessionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const functions = getFunctions(); // Functions instance'ı
  const logoutInProgressRef = React.useRef<boolean>(false);

  // Oturum süresi takibi (periyodik kayıt)
  useEffect(() => {
    if (user) {
      sessionStartRef.current = Date.now();
      sessionAccumulatedRef.current = 0;

      // Her 5 dakikada bir Firestore'a yaz - Optimized for mobile
      sessionIntervalRef.current = setInterval(async () => {
        if (sessionStartRef.current) {
          const now = Date.now();
          const elapsed = now - sessionStartRef.current + sessionAccumulatedRef.current;
          const minutes = Math.floor(elapsed / 60000);
          if (minutes > 0) {
            try {
              await updateSessionTime(user.id, minutes);
            } catch (e) {
              console.error('Periyodik oturum süresi Firestore\'a yazılamadı:', e);
            }
            // Kalan ms'yi bir sonraki tura aktar
            const leftover = elapsed % 60000;
            sessionStartRef.current = now - leftover;
            sessionAccumulatedRef.current = 0;
          } else {
            // Henüz 5 dakika dolmadıysa, biriktir
            sessionAccumulatedRef.current = elapsed;
          }
        }
      }, 300000);

      const handleSessionEnd = async () => {
        if (sessionStartRef.current) {
          const now = Date.now();
          const elapsed = now - sessionStartRef.current + sessionAccumulatedRef.current;
          const minutes = Math.floor(elapsed / 60000);
          if (minutes > 0) {
            try {
              await updateSessionTime(user.id, minutes);
            } catch (e) {
              console.error('Çıkışta oturum süresi Firestore\'a yazılamadı:', e);
            }
          }
          sessionStartRef.current = null;
          sessionAccumulatedRef.current = 0;
        }
      };

      window.addEventListener('beforeunload', handleSessionEnd);
      window.addEventListener('pagehide', handleSessionEnd);
      
      return () => {
        handleSessionEnd();
        window.removeEventListener('beforeunload', handleSessionEnd);
        window.removeEventListener('pagehide', handleSessionEnd);
        if (sessionIntervalRef.current) {
          clearInterval(sessionIntervalRef.current);
          sessionIntervalRef.current = null;
        }
      };
    } else {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
      return undefined;
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Eğer logout işlemi devam ediyorsa, otomatik giriş yapma
      if (logoutInProgressRef.current) {
        console.log('Logout işlemi devam ediyor, otomatik giriş engellendi');
        return;
      }
      
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser);
        setUser(profile);
        setIsAuthenticated(true);
        // OneSignal ile kullanıcı eşitleme
        try { await syncOneSignalForUser(firebaseUser.uid); } catch {}
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Google redirect sonucunu kontrol et
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Google redirect sonucu alındı:', result.user.uid);
          const profile = await getUserProfile(result.user);
          setUser(profile);
          setIsAuthenticated(true);
          setError(null);
        }
      } catch (error: any) {
        console.error('❌ Google redirect hatası:', error);
        if (error.code !== 'auth/no-auth-event') {
          setError('Google ile giriş sırasında bir hata oluştu.');
        }
      }
    };

    checkRedirectResult();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    console.log('🔐 Login işlemi başlıyor...');
    console.log('   - Email:', email);
    console.log('   - Remember Me:', rememberMe);
    console.log('   - Current Domain:', window.location.hostname);
    console.log('   - User Agent:', navigator.userAgent);
    
    // Domain kontrolü yap
    const { isAndroidStudio, isEmulator } = checkDomainAndSetup();
    
    try {
      if (rememberMe) {
        console.log('💾 Remember me ayarı uygulanıyor...');
        await setPersistence(auth, browserLocalPersistence);
      }
      
      console.log('🔥 Firebase Auth ile giriş yapılıyor...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase Auth başarılı:', result.user.uid);
      
      console.log('👤 Kullanıcı profili alınıyor...');
      const profile = await getUserProfile(result.user);
      console.log('✅ Kullanıcı profili alındı:', profile.displayName);
      
      setUser(profile);
      setIsAuthenticated(true);
      setError(null); // Hata mesajını temizle
      console.log('🎉 Login işlemi başarıyla tamamlandı!');
      return true;
    } catch (e: any) {
      console.error('❌ Login hatası:', e);
      console.error('   - Hata kodu:', e.code);
      console.error('   - Hata mesajı:', e.message);
      console.error('   - Hata detayı:', e);
      
      // Firebase Auth hata kodlarını kullanıcı dostu mesajlara çevir
      let userFriendlyMessage = 'Giriş başarısız. Bilgileri kontrol edin.';
      
      if (e.code === 'auth/user-not-found') {
        userFriendlyMessage = 'Bu email adresi ile kayıtlı kullanıcı bulunamadı.';
      } else if (e.code === 'auth/wrong-password') {
        userFriendlyMessage = 'Şifre yanlış. Lütfen tekrar deneyin.';
      } else if (e.code === 'auth/invalid-email') {
        userFriendlyMessage = 'Geçersiz email adresi.';
      } else if (e.code === 'auth/user-disabled') {
        userFriendlyMessage = 'Bu hesap devre dışı bırakılmış.';
      } else if (e.code === 'auth/too-many-requests') {
        userFriendlyMessage = 'Çok fazla başarısız deneme. Lütfen bir süre bekleyin.';
      } else if (e.code === 'auth/network-request-failed') {
        userFriendlyMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
      } else if (e.code === 'auth/unauthorized-domain') {
        userFriendlyMessage = 'Bu domain\'den giriş yapılamıyor. Firebase Console\'da domain yetkilendirmesi gerekli.';
      } else if (e.code === 'auth/operation-not-allowed') {
        userFriendlyMessage = 'Email/şifre ile giriş devre dışı.';
      } else if (e.code === 'auth/invalid-credential') {
        userFriendlyMessage = 'Geçersiz kimlik bilgileri.';
      } else if (e.code === 'auth/account-exists-with-different-credential') {
        userFriendlyMessage = 'Bu email adresi farklı bir giriş yöntemi ile kayıtlı.';
      } else if (e.code === 'auth/requires-recent-login') {
        userFriendlyMessage = 'Bu işlem için son girişinizi tekrar yapmanız gerekiyor.';
      } else {
        userFriendlyMessage = `Giriş hatası: ${e.message}`;
      }
      
      setError(userFriendlyMessage);
      return false;
    }
  };



  const register = async (email: string, password: string, displayName: string): Promise<boolean> => {
    console.log('🚀 Kayıt işlemi başlıyor...');
    console.log('   - Email:', email);
    console.log('   - Display Name:', displayName);
    
    setLoading(true);
    setError(null);
    try {
      // 1. Find inviter BEFORE creating the new user
      let inviterId = null;
      const refCode = sessionStorage.getItem('referralCode');
      console.log('🔍 Referral kodu kontrol ediliyor:', refCode);
      
      if (refCode) {
        try {
          const inviterUser = await findUserByReferralCode(refCode);
          if (inviterUser) {
            inviterId = inviterUser.id;
            console.log('✅ Davet eden kullanıcı bulundu:', inviterUser.displayName);
          } else {
            console.log('⚠️ Referral kodu geçersiz:', refCode);
          }
        } catch (error) {
          console.error('❌ Referral kodu kontrolü sırasında hata:', error);
        }
      }

      // 2. Create the new user
      console.log('👤 Firebase Auth ile kullanıcı oluşturuluyor...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Firebase Auth kullanıcısı oluşturuldu:', user.uid);
      
      console.log('📝 Kullanıcı profil güncelleniyor...');
      await updateProfile(user, { displayName });
      console.log('✅ Kullanıcı profili güncellendi');
      
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      const newUser: User = {
        id: user.uid,
        email: user.email || '',
        displayName: displayName,
        avatar: displayName[0]?.toUpperCase() || 'K',
        stats: getDefaultStats(),
        jokers: getDefaultJokers(),
        jokersUsed: getDefaultJokersUsed(),
        energy: 100,
        lastEnergyUpdate: new Date().toISOString(),
        energyLimit: 100,
        energyRegenSpeed: 300,
        coins: 2000,
        unlockedTests: {},
        referral: {
          code: generateReferralCode(user.uid),
          invitedBy: inviterId,
          allTimeInvites: 0,
          monthlyInvites: {
            [currentMonthKey]: 0,
          },
        },
      };

      console.log('📊 Firestore\'a kullanıcı verisi yazılıyor...');
      const newUserRef = doc(db, 'users', user.uid);
      await setDoc(newUserRef, newUser);
      console.log('✅ Firestore\'a kullanıcı verisi yazıldı');

      // 3. Award the inviter (if they exist and are not the same user)
      if (inviterId && inviterId !== user.uid) {
        try {
          console.log('🎁 Ödül verme işlemi başlıyor...');
          console.log('   - Davet eden ID:', inviterId);
          console.log('   - Yeni kullanıcı ID:', user.uid);
          
          const inviterRef = doc(db, 'users', inviterId);
          
          // Önce mevcut kullanıcı verisini al
          const inviterSnap = await getDoc(inviterRef);
          if (!inviterSnap.exists()) {
            console.log('❌ Davet eden kullanıcı bulunamadı');
            return true;
          }
          
          const inviterData = inviterSnap.data();
          const currentAllTimeInvites = inviterData.referral?.allTimeInvites || 0;
          const newAllTimeInvites = currentAllTimeInvites + 1;
          
          // Sadece ilk 3 davet için ödül ver
          const shouldGiveReward = newAllTimeInvites <= 3;
          
          if (shouldGiveReward) {
            console.log('💰 Ödül veriliyor (davet #' + newAllTimeInvites + ')');
            
            const currentExperience = inviterData.stats?.experience || 0;
            const newExperience = currentExperience + 10000;
            
            // Level hesaplaması
            let newLevel = 1;
            const maxLevel = 100;
            for (let lvl = 1; lvl <= maxLevel; lvl++) {
              if (newExperience < getXpForLevel(lvl + 1)) {
                newLevel = lvl;
                break;
              }
            }
            if (newLevel > maxLevel) newLevel = maxLevel;
            const newRank = getRankForLevel(newLevel);
            const experienceToNext = getXpForLevel(newLevel + 1) - newExperience;
            
            console.log('📊 Level hesaplaması:');
            console.log('   - Mevcut XP:', currentExperience);
            console.log('   - Yeni XP:', newExperience);
            console.log('   - Mevcut Level:', inviterData.stats?.level || 1);
            console.log('   - Yeni Level:', newLevel);
            console.log('   - Yeni Rank:', newRank);
            
            // Güncellenmiş verileri yaz (ödül ile)
            const currentMonthKey = new Date().toISOString().slice(0, 7);
            const currentMonthlyInvites = inviterData.referral?.monthlyInvites?.[currentMonthKey] || 0;
            
            await updateDoc(inviterRef, {
              coins: increment(10000),
              'stats.experience': newExperience,
              'stats.level': newLevel,
              'stats.rank': newRank,
              'stats.experienceToNext': experienceToNext,
              'referral.allTimeInvites': newAllTimeInvites,
              [`referral.monthlyInvites.${currentMonthKey}`]: currentMonthlyInvites + 1
            });
            
            console.log('✅ Ödül başarıyla verildi');
          } else {
            console.log('📝 Ödül verilmiyor (davet #' + newAllTimeInvites + ' - limit aşıldı)');
            
            // Sadece davet sayısını güncelle (ödül verme)
            const currentMonthKey = new Date().toISOString().slice(0, 7);
            const currentMonthlyInvites = inviterData.referral?.monthlyInvites?.[currentMonthKey] || 0;
            
            await updateDoc(inviterRef, {
              'referral.allTimeInvites': newAllTimeInvites,
              [`referral.monthlyInvites.${currentMonthKey}`]: currentMonthlyInvites + 1
            });
          }
          
          sessionStorage.removeItem('referralCode');
          
        } catch (error: any) {
          console.error('❌ Ödül verme sırasında hata:', error);
          console.error('   - Hata detayı:', error.message);
          console.error('   - Hata kodu:', error.code);
        }
      } else {
        console.log('ℹ️ Ödül verilmedi:');
        console.log('   - inviterId:', inviterId);
        console.log('   - user.uid:', user.uid);
        console.log('   - Koşul:', inviterId && inviterId !== user.uid);
      }

      console.log('🎉 Kayıt işlemi başarıyla tamamlandı!');
      setUser(newUser);
      setIsAuthenticated(true);
      return true;

    } catch (error: any) {
      console.error("❌ Registration Error: ", error);
      console.error("   - Hata kodu:", error.code);
      console.error("   - Hata mesajı:", error.message);
      console.error("   - Hata detayı:", error);
      
      // Firebase Auth hata kodlarını kullanıcı dostu mesajlara çevir
      let userFriendlyMessage = 'Kayıt işlemi başarısız oldu.';
      
      if (error.code === 'auth/email-already-in-use') {
        userFriendlyMessage = 'Bu email adresi zaten kullanımda.';
      } else if (error.code === 'auth/invalid-email') {
        userFriendlyMessage = 'Geçersiz email adresi.';
      } else if (error.code === 'auth/operation-not-allowed') {
        userFriendlyMessage = 'Email/şifre ile kayıt devre dışı.';
      } else if (error.code === 'auth/weak-password') {
        userFriendlyMessage = 'Şifre çok zayıf. En az 6 karakter kullanın.';
      } else if (error.code === 'auth/network-request-failed') {
        userFriendlyMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
      } else if (error.code === 'auth/too-many-requests') {
        userFriendlyMessage = 'Çok fazla deneme. Lütfen bir süre bekleyin.';
      } else if (error.code === 'auth/unauthorized-domain') {
        userFriendlyMessage = 'Bu domain\'den giriş yapılamıyor. Firebase Console\'da domain yetkilendirmesi gerekli.';
      } else if (error.code === 'auth/quota-exceeded') {
        userFriendlyMessage = 'Kota aşıldı. Lütfen daha sonra tekrar deneyin.';
      } else {
        userFriendlyMessage = `Kayıt hatası: ${error.message}`;
      }
      
      setError(userFriendlyMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };



  const logout = useCallback(async () => {
    // Logout işlemi başladığını işaretle
    logoutInProgressRef.current = true;
    
    // Oturum süresi kaydet (kalan süre)
    if (sessionStartRef.current && user) {
      const now = Date.now();
      const elapsed = now - sessionStartRef.current + sessionAccumulatedRef.current;
      const minutes = Math.floor(elapsed / 60000);
      if (minutes > 0) {
        try {
          await updateSessionTime(user.id, minutes);
        } catch (e) {
          // Logout sırasında oturum süresi Firestore'a yazılamadı
        }
      }
      sessionStartRef.current = null;
      sessionAccumulatedRef.current = 0;
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
    }
    
    // Önce oturum kalıcılığını session-only olarak ayarla
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (error) {
      console.error('Oturum kalıcılığı ayarlanamadı:', error);
    }
    
    // Firebase Auth'dan çıkış yap
    await signOut(auth);
    
    // Local storage ve session storage'ı temizle
    localStorage.clear();
    sessionStorage.clear();
    
    // State'i temizle
    setUser(null);
    setIsAuthenticated(false);
    
    // Logout işlemi tamamlandığını işaretle
    logoutInProgressRef.current = false;
    
    // Login sayfasına yönlendir
    window.location.href = '/login?logout=true';
  }, [user]);

  const updateUserStats = useCallback(async (correct: number, total: number, duration?: number) => {
    if (user) {
      const userRef = doc(db, 'users', user.id);
      
      // GÜNCELLEME: Liderlik tablosu verilerini yazmadan önce en güncel kullanıcı verisini çek.
      // Bu, `longestStreak` gibi başka yerlerde güncellenen verilerin tutarlı olmasını sağlar.
      const freshUserSnap = await getDoc(userRef);
      if (!freshUserSnap.exists()) {
        console.error("User document not found for stats update.");
        return;
      }
      const freshUser = freshUserSnap.data() as User;

      // Istanbul saatine göre tarih al
      const now = new Date();
      const istanbulDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      const today = istanbulDate.toISOString().split('T')[0];
      
      // --- XP, Seviye ve Rütbe Hesaplamaları ---
      const percent = total > 0 ? (correct / total) * 100 : 0;
      const baseXp = correct * 20;
      let gainedXp = baseXp;
      if (percent === 100) {
        gainedXp = baseXp * 2;
      } else if (percent < 70) {
        gainedXp = Math.floor(baseXp / 2);
      }
      const gainedCoin = gainedXp; // Kazanılan XP kadar coin veriliyor

      const newExperience = (freshUser.stats.experience || 0) + gainedXp;
      let newLevel = 1;
      const maxLevel = 100;
      for (let lvl = 1; lvl <= maxLevel; lvl++) {
        if (newExperience < getXpForLevel(lvl + 1)) {
          newLevel = lvl;
          break;
        }
      }
      if (newLevel > maxLevel) newLevel = maxLevel;
      const newRank = getRankForLevel(newLevel);
      const experienceToNext = getXpForLevel(newLevel + 1) - newExperience;

      // --- Tüm güncellemeleri tek bir objede topla ---
      const updates: any = {
        'stats.totalQuizzes': increment(1),
        'stats.correctAnswers': increment(correct),
        'stats.totalQuestions': increment(total),
        'stats.experience': newExperience,
        'stats.level': newLevel,
        'stats.rank': newRank,
        'stats.experienceToNext': experienceToNext,
        coins: increment(gainedCoin),

        // Leaderboard Alanları
        'leaderboard.allTime.topxp': newExperience,
        'leaderboard.month.topxp': increment(gainedXp),
        'leaderboard.allTime.topcorrect': (freshUser.stats.correctAnswers || 0) + correct,
        'leaderboard.month.topcorrect': increment(correct),
        'leaderboard.allTime.topcoin': increment(gainedCoin),
        'leaderboard.month.topcoin': increment(gainedCoin),
        'leaderboard.allTime.topstreak': freshUser.streak?.longestStreak || 0,
        'leaderboard.month.topstreak': freshUser.streak?.currentStreak || 0,
        'leaderboard.updatedAt': new Date().toISOString()
      };

      // Quiz süresini ekle
      if (duration) {
        updates['stats.totalQuizTime'] = increment(duration);
      }

      // Günlük aktivite - doğru increment yöntemi
      updates[`stats.dailyActivity.${today}.questionsSolved`] = increment(total);
      updates[`stats.dailyActivity.${today}.correctAnswers`] = increment(correct);
      


      await updateDoc(userRef, updates);
      
      // Firestore'dan güncel profili çek ve state'i güncelle
      const updatedSnap = await getDoc(userRef);
      if (updatedSnap.exists()) {
        setUser(updatedSnap.data() as User);
      }
      
      return { gainedXp, gainedCoin };
    }
    return;
  }, [user]);

  const clearUserStats = useCallback(async () => {
    if (user) {
      const userRef = doc(db, 'users', user.id);
      const updates: any = {
        'stats.totalQuizzes': 0,
        'stats.correctAnswers': 0,
        'stats.totalQuestions': 0,
        'stats.dailyActivity': {},
        'stats.level': 1,
        'stats.experience': 0,
        'stats.experienceToNext': 100
      };
      await updateDoc(userRef, updates);
      
      // Kullanıcı bilgilerini güncelle (çıkış yapmadan)
      const updatedSnap = await getDoc(userRef);
      if (updatedSnap.exists()) {
        setUser(updatedSnap.data() as User);
      }
    }
  }, [user]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    // Cache'i de güncelle
    if (updatedUser.id) {
      firestoreCache.setUserData(updatedUser.id, updatedUser);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (user) {
      try {
        // Önce cache'den kontrol et
        const cachedUser = firestoreCache.getUserData(user.id);
        if (cachedUser) {
          console.log('📊 AuthContext: Kullanıcı verisi cache\'den alındı');
          setUser(cachedUser);
          return;
        }

        // Cache yoksa Firestore'dan çek
        console.log('📊 AuthContext: Kullanıcı verisi Firestore\'dan çekiliyor');
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          console.log('AuthContext - Firestore\'dan çekilen joker hakları:', userData.jokers);
          
          // Günlük joker haklarını kontrol et ve gerekirse sıfırla
          const updatedJokers = await resetDailyJokers(user.id, userData.jokers);
          if (JSON.stringify(updatedJokers) !== JSON.stringify(userData.jokers)) {
            console.log('AuthContext - Joker hakları sıfırlandı:', updatedJokers);
            userData.jokers = updatedJokers;
          }
          
          // totalSessionTime'ı doğru yerden al
          if (userData.totalSessionTime !== undefined) {
            userData.stats.totalSessionTime = userData.totalSessionTime;
          }
          
          setUser(userData);
          // Cache'e kaydet
          firestoreCache.setUserData(user.id, userData);
          console.log('AuthContext - Kullanıcı güncellendi ve cache\'e kaydedildi');
        }
      } catch (error) {
        console.error('AuthContext - refreshUser hatası:', error);
      }
    }
  }, [user]);

  // Şifre sıfırlama
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      setError(null);
      return true;
    } catch (e: any) {
      let userFriendlyMessage = 'Şifre sıfırlama gönderilemedi.';
      if (e.code === 'auth/user-not-found') {
        userFriendlyMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
      } else if (e.code === 'auth/invalid-email') {
        userFriendlyMessage = 'Geçersiz e-posta adresi.';
      } else if (e.code === 'auth/network-request-failed') {
        userFriendlyMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
      } else {
        userFriendlyMessage = `Şifre sıfırlama hatası: ${e.message}`;
      }
      setError(userFriendlyMessage);
      return false;
    }
  }, []);

  const manualResetJokers = useCallback(async () => {
    if (user) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const newJokers: Jokers = {
          eliminate: { count: 3, lastReset: today },
          extraTime: { count: 3, lastReset: today },
          doubleAnswer: { count: 3, lastReset: today },
          autoCorrect: { count: 3, lastReset: today },
        };
        
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { jokers: newJokers });
        console.log('Manuel joker yenileme tamamlandı:', newJokers);
        setUser(user);
        console.log('AuthContext - Kullanıcı güncellendi');
      } catch (error) {
        console.error('AuthContext - manualResetJokers hatası:', error);
      }
    }
  }, [user]);

  // Test sonuçlarını alma fonksiyonu (Sadece Firestore)
  const getTestResults = useCallback((subjectTopicKey: string) => {
    if (!user?.id) return {};
    
    // Sadece Firestore'dan al
    const firestoreResults = user.testResults?.[subjectTopicKey] || {};
    console.log('📊 Firestore\'dan test sonuçları alındı:', {
      subjectTopicKey,
      firestoreResults
    });
    return firestoreResults;
  }, [user]);

  // Açılan testleri alma fonksiyonu (Sadece Firestore)
  const getUnlockedTests = useCallback((subjectTopicKey: string): number[] => {
    if (!user?.id) return [];
    
    // Sadece Firestore'dan al
    const firestoreUnlocked = user.unlockedTests?.[subjectTopicKey] || [];
    console.log('🔓 Firestore\'dan açılan testler alındı:', {
      subjectTopicKey,
      firestoreUnlocked
    });
    return firestoreUnlocked;
  }, [user]);

  // Optimized context value
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    updateUserStats,
    clearUserStats,
    updateUser,
    refreshUser,
    manualResetJokers,
    getTestResults,
    getUnlockedTests,
    resetPassword
  }), [
    user, 
    isAuthenticated, 
    loading,
    error,
    login,
    register, 
    logout, 
    updateUserStats, 
    clearUserStats, 
    updateUser, 
    refreshUser, 
    manualResetJokers,
    getTestResults,
    getUnlockedTests,
    resetPassword
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 