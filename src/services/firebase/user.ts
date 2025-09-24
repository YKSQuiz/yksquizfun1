import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, increment as fbIncrement } from 'firebase/firestore';
import { db } from './config';
import { deleteUser, signOut } from 'firebase/auth';
import { auth } from './config';

/**
 * Kullanıcının oturum süresini Firestore'da toplar
 */
export async function updateSessionTime(uid: string, sessionDuration: number) {
  console.log('Firestore\'a yazılıyor:', uid, sessionDuration);
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const prevTime = userSnap.data().totalSessionTime || 0;
    await updateDoc(userRef, {
      totalSessionTime: prevTime + sessionDuration,
    });
  } else {
    await setDoc(userRef, {
      totalSessionTime: sessionDuration,
    }, { merge: true });
  }
}

/**
 * Kullanıcının enerjisini ve son güncelleme zamanını Firestore'da günceller
 */
export async function updateUserEnergy(uid: string, newEnergy: number, lastUpdate: string) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    energy: newEnergy,
    lastEnergyUpdate: lastUpdate,
  });
}

/**
 * Streak sistemini günceller ve coin ödülü verir
 */
export async function updateStreak(uid: string) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return { success: false, message: 'Kullanıcı bulunamadı' };
  }
  
  const userData = userSnap.data();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
  const currentStreak = userData.streak?.currentStreak || 0;
  const longestStreak = userData.streak?.longestStreak || 0;
  const lastLoginDate = userData.streak?.lastLoginDate || '';
  const totalCoinsEarned = userData.streak?.totalCoinsEarned || 0;
  const currentCoins = userData.coins || 0;
  
  // Eğer bugün zaten giriş yapılmışsa
  if (lastLoginDate === today) {
    return { 
      success: true, 
      message: 'Bugün zaten giriş yapılmış',
      streak: currentStreak,
      coins: currentCoins,
      newCoins: 0
    };
  }
  
  // Dün giriş yapılmışsa streak devam eder
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  let newStreak = 1; // Yeni streak başlar
  let coinsEarned = 100; // İlk gün 100 coin
  
  if (lastLoginDate === yesterdayStr) {
    // Streak devam ediyor
    newStreak = currentStreak + 1;
    coinsEarned = 100 + (newStreak - 1) * 50; // Her gün 50 coin artış
  } else if (lastLoginDate !== today) {
    // Streak kırıldı, yeni streak başlar
    newStreak = 1;
    coinsEarned = 100;
  }
  
  const newLongestStreak = Math.max(longestStreak, newStreak);
  const newTotalCoinsEarned = totalCoinsEarned + coinsEarned;
  const newTotalCoins = currentCoins + coinsEarned;
  
  await updateDoc(userRef, {
    'streak.currentStreak': newStreak,
    'streak.longestStreak': newLongestStreak,
    'streak.lastLoginDate': today,
    'streak.totalCoinsEarned': newTotalCoinsEarned,
    'coins': newTotalCoins,
    // Liderlik tablosu için streak verilerini de güncelle
    'leaderboard.month.topstreak': newStreak,
    'leaderboard.allTime.topstreak': newLongestStreak,
    'leaderboard.updatedAt': new Date().toISOString()
  });

  // Leaderboard coin güncellemesi
  try {
    await updateDoc(userRef, {
      'leaderboard.allTime.topcoin': fbIncrement(coinsEarned),
      'leaderboard.month.topcoin': fbIncrement(coinsEarned),
      'leaderboard.updatedAt': new Date().toISOString()
    });
  } catch (e) {
    // Leaderboard güncellemesi başarısız olsa bile akışı bozma
  }
  
  return {
    success: true,
    message: newStreak > currentStreak ? 
      `Harika! ${newStreak} günlük serin devam ediyor! +${coinsEarned} coin kazandın!` :
      'Yeni streak başladı! +100 coin kazandın!',
    streak: newStreak,
    coins: newTotalCoins,
    newCoins: coinsEarned,
    isNewStreak: newStreak > currentStreak
  };
}

/**
 * Kullanıcının streak bilgilerini getirir
 */
export async function getStreakInfo(uid: string) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  const userData = userSnap.data();
  return {
    currentStreak: userData.streak?.currentStreak || 0,
    longestStreak: userData.streak?.longestStreak || 0,
    lastLoginDate: userData.streak?.lastLoginDate || '',
    totalCoinsEarned: userData.streak?.totalCoinsEarned || 0,
    coins: userData.coins || 0
  };
}

/**
 * Kullanıcı hesabını ve tüm verilerini siler
 */
export async function deleteUserAccount(uid: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Önce tüm kullanıcı verilerini Firestore'dan sil
    const userRef = doc(db, 'users', uid);
    
    // Kullanıcı verilerini sil
    await deleteDoc(userRef);
    
    // 2. Kullanıcıya ait diğer koleksiyonları da temizle (varsa)
    // Örnek: quiz sonuçları, istatistikler vb.
    const collectionsToClean = ['quizResults', 'userStats', 'userProgress'];
    
    for (const collectionName of collectionsToClean) {
      try {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, where('userId', '==', uid));
        const querySnapshot = await getDocs(q);
        
        // Bu koleksiyondaki tüm kullanıcı verilerini sil
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } catch (error) {
        // Koleksiyon yoksa veya hata olursa devam et
        console.log(`${collectionName} koleksiyonu temizlenirken hata:`, error);
      }
    }
    
    // 3. Firebase Auth'dan kullanıcıyı sil
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await deleteUser(currentUser);
    }
    
    // 4. Oturumu tamamen temizle
    await signOut(auth);
    
    // 5. Local storage'ı temizle
    localStorage.clear();
    sessionStorage.clear();
    
    return {
      success: true,
      message: 'Hesabınız başarıyla silindi'
    };
  } catch (error) {
    console.error('Hesap silme hatası:', error);
    
    // Hata durumunda da oturumu temizlemeye çalış
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
    } catch (signOutError) {
      console.error('Oturum temizleme hatası:', signOutError);
    }
    
    return {
      success: false,
      message: 'Hesap silme işlemi başarısız oldu. Lütfen tekrar deneyin.'
    };
  }
} 