import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  orderBy, 
  limit,
  where,
  writeBatch,
  updateDoc,
  increment,
  QueryDocumentSnapshot,
  onSnapshot as onSnapshotRealtime,
  DocumentData,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { 
  LeaderboardData, 
  LeaderboardUser, 
  RewardData, 
  MonthlyRewards, 
  calculateReward,
  UserPrivacySettings,
  MotivationMessage,
  LeaderboardArchive,
  PerformanceMetrics,
  generateMotivationMessage,
  calculatePerformanceMetrics
} from '../../types/leaderboard';
import { User } from '../../types/user';

// Cloud Functions
const functions = getFunctions();
const manualUpdateLeaderboards = httpsCallable(functions, 'manualUpdateLeaderboards');

// Mock data for testing when Firebase is not available
const mockLeaderboardData: LeaderboardData = {
  top_xp: [
    {
      userId: 'mock-user-1',
      displayName: 'Test User 1',
      avatar: 'T',
      level: 5,
      title: 'Bronze',
      value: 5000,
      rank: 1
    },
    {
      userId: 'mock-user-2',
      displayName: 'Test User 2',
      avatar: 'U',
      level: 4,
      title: 'Silver',
      value: 3000,
      rank: 2
    },
    {
      userId: 'mock-user-3',
      displayName: 'Test User 3',
      avatar: 'S',
      level: 6,
      title: 'Gold',
      value: 7000,
      rank: 3
    }
  ],
  top_correct: [
    {
      userId: 'mock-user-3',
      displayName: 'Test User 3',
      avatar: 'S',
      level: 6,
      title: 'Gold',
      value: 350,
      rank: 1
    },
    {
      userId: 'mock-user-1',
      displayName: 'Test User 1',
      avatar: 'T',
      level: 5,
      title: 'Bronze',
      value: 250,
      rank: 2
    },
    {
      userId: 'mock-user-2',
      displayName: 'Test User 2',
      avatar: 'U',
      level: 4,
      title: 'Silver',
      value: 180,
      rank: 3
    }
  ],
  top_coin: [
    {
      userId: 'mock-user-3',
      displayName: 'Test User 3',
      avatar: 'S',
      level: 6,
      title: 'Gold',
      value: 1200,
      rank: 1
    },
    {
      userId: 'mock-user-1',
      displayName: 'Test User 1',
      avatar: 'T',
      level: 5,
      title: 'Bronze',
      value: 1000,
      rank: 2
    },
    {
      userId: 'mock-user-2',
      displayName: 'Test User 2',
      avatar: 'U',
      level: 4,
      title: 'Silver',
      value: 800,
      rank: 3
    }
  ],
  top_streak: [
    {
      userId: 'mock-user-3',
      displayName: 'Test User 3',
      avatar: 'S',
      level: 6,
      title: 'Gold',
      value: 20,
      rank: 1
    },
    {
      userId: 'mock-user-1',
      displayName: 'Test User 1',
      avatar: 'T',
      level: 5,
      title: 'Bronze',
      value: 15,
      rank: 2
    },
    {
      userId: 'mock-user-2',
      displayName: 'Test User 2',
      avatar: 'U',
      level: 4,
      title: 'Silver',
      value: 12,
      rank: 3
    }
  ],
  generatedAt: new Date().toISOString()
};

/**
 * Aylık leaderboard verilerini oluşturur
 */
export async function generateMonthlyLeaderboard(monthKey: string): Promise<LeaderboardData> {
  console.log(`Generating leaderboard for ${monthKey}`);
  
  try {
    // Tüm kullanıcıları çek
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const users: User[] = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });

    // Aylık verileri hesapla
    const monthlyData = users.map(user => {
      const monthlyStats = calculateMonthlyStats(user, monthKey);
      return {
        userId: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.stats?.level || 1,
        title: user.stats?.rank,
        monthlyStats
      };
    });

    // Kategorilere göre sırala
    const top_xp = monthlyData
      .filter(user => user.monthlyStats.xp > 0)
      .sort((a, b) => b.monthlyStats.xp - a.monthlyStats.xp)
      .slice(0, 100)
      .map((user, index) => ({
        userId: user.userId,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        title: user.title,
        value: user.monthlyStats.xp,
        rank: index + 1
      }));

    const top_correct = monthlyData
      .filter(user => user.monthlyStats.correctAnswers > 0)
      .sort((a, b) => b.monthlyStats.correctAnswers - a.monthlyStats.correctAnswers)
      .slice(0, 100)
      .map((user, index) => ({
        userId: user.userId,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        title: user.title,
        value: user.monthlyStats.correctAnswers,
        rank: index + 1
      }));

    const top_coin = monthlyData
      .filter(user => user.monthlyStats.coins > 0)
      .sort((a, b) => b.monthlyStats.coins - a.monthlyStats.coins)
      .slice(0, 100)
      .map((user, index) => ({
        userId: user.userId,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        title: user.title,
        value: user.monthlyStats.coins,
        rank: index + 1
      }));

    const top_streak = monthlyData
      .filter(user => user.monthlyStats.streak > 0)
      .sort((a, b) => b.monthlyStats.streak - a.monthlyStats.streak)
      .slice(0, 100)
      .map((user, index) => ({
        userId: user.userId,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        title: user.title,
        value: user.monthlyStats.streak,
        rank: index + 1
      }));

    const leaderboardData: LeaderboardData = {
      top_xp,
      top_correct,
      top_coin,
      top_streak,
      generatedAt: new Date().toISOString()
    };

    console.log(`Leaderboard generated for ${monthKey}:`, {
      xp: top_xp.length,
      correct: top_correct.length,
      coin: top_coin.length,
      streak: top_streak.length
    });

    return leaderboardData;
  } catch (error) {
    console.error('Error generating monthly leaderboard:', error);
    console.log('Returning mock data as fallback');
    return mockLeaderboardData;
  }
}

/**
 * Kullanıcının aylık istatistiklerini hesaplar
 */
function calculateMonthlyStats(user: User, monthKey: string) {
  const [year, month] = monthKey.split('-');
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);
  
  let monthlyXp = 0;
  let monthlyCorrectAnswers = 0;
  let monthlyCoins = 0;
  let monthlyStreak = 0;

  // Daily activity'den aylık verileri topla
  if (user.stats?.dailyActivity) {
    Object.entries(user.stats.dailyActivity).forEach(([date, activity]) => {
      const activityDate = new Date(date);
      if (activityDate >= startDate && activityDate <= endDate) {
        // XP hesaplama (her doğru cevap 10 XP)
        monthlyXp += (activity.correctAnswers || 0) * 10;
        monthlyCorrectAnswers += activity.correctAnswers || 0;
      }
    });
  }

  // Coin hesaplama (streak'ten kazanılan coinler)
  if (user.streak?.totalCoinsEarned) {
    // Bu ay kazanılan coin miktarını hesapla
    // Basit yaklaşım: toplam coin'in %30'u bu ay kazanılmış varsayalım
    monthlyCoins = Math.floor(user.streak.totalCoinsEarned * 0.3);
  }

  // Streak hesaplama
  if (user.streak?.currentStreak) {
    monthlyStreak = user.streak.currentStreak;
  }

  return {
    xp: monthlyXp,
    correctAnswers: monthlyCorrectAnswers,
    coins: monthlyCoins,
    streak: monthlyStreak
  };
}

/**
 * Belirli bir ayın leaderboard verisini Firestore'daki `leaderboards/{YYYY-MM}` dokümanından getirir.
 * Doküman yoksa geliştirme ortamı için fallback olarak lokal hesaplama yapılır.
 */
// FONKSİYON KALDIRILDI - Artık doğrudan 'users' koleksiyonu dinleniyor.
/*
export async function getMonthlyLeaderboard(monthKey: string): Promise<LeaderboardData | null> {
  try {
    const ref = doc(db, 'leaderboards', monthKey);
    // Daima en güncel sunucu verisini çek
    const snap = await getDocFromServer(ref);
    if (snap.exists()) {
      return snap.data() as LeaderboardData;
    }
    // FALLBACK KALDIRILDI: Anlık üretim maliyetli ve tehlikeli.
    // Artık veri yoksa null dönecek. Verinin backend tarafından oluşturulduğundan
    // emin olunmalıdır (Aşama 2'de bu yapılacak).
    console.warn(`Leaderboard document not found for ${monthKey}. Returning null.`);
    return null;
  } catch (error) {
    console.error('Error getting monthly leaderboard:', error);
    // Hata durumunda mock data yerine null dönerek arayüzde
    // kontrollü bir hata gösterimi sağlanabilir.
    return null;
  }
}
*/

/**
 * Tüm zamanların leaderboard verilerini oluşturur
 */
export async function generateAllTimeLeaderboard(): Promise<LeaderboardData> {
  console.log('Generating all-time leaderboard (users collection)');
  try {
    const usersRef = collection(db, 'users');

    // Her kategori için Firestore tarafında sıralama + limit kullan
    async function queryTop(
      fieldPath: string,
      valuePicker: (data: any) => number
    ): Promise<LeaderboardUser[]> {
      const qUsers = query(usersRef, orderBy(fieldPath, 'desc'), limit(100));
      const snap = await getDocs(qUsers);
      const result: LeaderboardUser[] = [];
      snap.forEach(d => {
        const u = d.data() as any;
        const value = valuePicker(u) || 0;
        if (value > 0) {
          result.push({
            userId: d.id,
            displayName: u.displayName,
            avatar: u.avatar,
            level: u.stats?.level || 1,
            title: u.stats?.rank,
            value,
            rank: 0
          });
        }
      });
      result.sort((a, b) => b.value - a.value);
      result.forEach((u, i) => (u.rank = i + 1));
      return result;
    }

    // Öncelikle kullanıcı dokümanlarındaki leaderboard özet alanlarını kullan
    // Yoksa stats içinden türet
    const [top_xp, top_correct, top_coin, top_streak] = await Promise.all([
      queryTop('leaderboard.allTime.topxp', (u) => {
        const fallback = u.stats?.experience || 0;
        return (u.leaderboard?.allTime?.topxp ?? u.leaderboard?.topxp ?? fallback) as number;
      }),
      queryTop('leaderboard.allTime.topcorrect', (u) => {
        const fallback = u.stats?.correctAnswers || 0;
        return (u.leaderboard?.allTime?.topcorrect ?? u.leaderboard?.topcorrect ?? fallback) as number;
      }),
      queryTop('leaderboard.allTime.topcoin', (u) => {
        return (u.leaderboard?.allTime?.topcoin ?? 0) as number;
      }),
      queryTop('leaderboard.allTime.topstreak', (u) => {
        const fallback = u.streak?.currentStreak || 0;
        return (u.leaderboard?.allTime?.topstreak ?? u.leaderboard?.topstreak ?? fallback) as number;
      })
    ]);

    return {
      top_xp,
      top_correct,
      top_coin,
      top_streak,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating all-time leaderboard:', error);
    console.log('Returning mock data as fallback');
    return mockLeaderboardData;
  }
}

/**
 * Anlık (real-time) leaderboard aboneliği. Dört kategori için ayrı sorgulara abone olur.
 */
export function subscribeLeaderboard(
  period: 'monthly' | 'allTime',
  onUpdate: (data: LeaderboardData) => void
): () => void {
  const basePath = period === 'monthly' ? 'leaderboard.month' : 'leaderboard.allTime';

  let leaderboardData: LeaderboardData = {
    top_xp: [],
    top_correct: [],
    top_coin: [],
    top_streak: [],
    generatedAt: new Date().toISOString()
  };

  const createSubscription = (field: keyof Omit<LeaderboardData, 'generatedAt'>, firestoreField: string) => {
    const q = query(
      collection(db, 'users'), 
      orderBy(`${basePath}.${firestoreField}`, 'desc'), 
      limit(100)
    );
    
    return onSnapshotRealtime(q, (snapshot) => {
      const users: LeaderboardUser[] = [];
      let rank = 1;
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        users.push({
          userId: doc.id,
          displayName: data.displayName,
          avatar: data.avatar,
          level: data.stats?.level || 1,
          title: data.stats?.rank,
          value: data.leaderboard?.[period === 'monthly' ? 'month' : 'allTime']?.[firestoreField] || 0,
          rank: rank++
        });
      });
      
      leaderboardData = {
        ...leaderboardData,
        [field]: users,
        generatedAt: new Date().toISOString()
      };

      onUpdate(leaderboardData);
    });
  };

  const unsubTopXp = createSubscription('top_xp', 'topxp');
  const unsubTopCorrect = createSubscription('top_correct', 'topcorrect');
  const unsubTopCoin = createSubscription('top_coin', 'topcoin');
  const unsubTopStreak = createSubscription('top_streak', 'topstreak');

  return () => {
    unsubTopXp();
    unsubTopCorrect();
    unsubTopCoin();
    unsubTopStreak();
  };
}

/**
 * Kullanıcının leaderboard pozisyonunu getirir
 */
export async function getUserLeaderboardPosition(
  userId: string, 
  category: 'top_xp' | 'top_correct' | 'top_coin' | 'top_streak',
  period: 'monthly' | 'allTime' = 'monthly'
): Promise<number | null> {
  // Bu fonksiyonun yeni mantığı, anlık bir sorgu ile kullanıcının sırasını bulmak olmalıdır.
  // subscribeLeaderboard'dan gelen veriyi kullanmak yerine, gerektiğinde tek seferlik bir okuma yapar.
  try {
    const basePath = period === 'monthly' ? 'leaderboard.month' : 'leaderboard.allTime';
    const firestoreField = category.replace('top_', '');
    
    // Önce kullanıcının kendi değerini al
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    const userValue = userSnap.data().leaderboard?.[period === 'monthly' ? 'month' : 'allTime']?.[firestoreField] || 0;

    if (userValue === 0) return null; // Sıralamada değil

    // Kendisinden daha yüksek puana sahip kullanıcıları say
    const q = query(
      collection(db, 'users'),
      where(`${basePath}.${firestoreField}`, '>', userValue)
    );
    
    // Firestore'un count() aggregasyonunu kullanmak daha verimli olacaktır.
    // Ancak bu client-side SDK'da direkt olarak bu şekilde basit değil.
    // Bu yüzden şimdilik dokümanları çekip sayıyoruz.
    // Daha verimli bir yöntem için getCountFromServer kullanılabilir.
    const snapshot = await getDocs(q);
    const rank = snapshot.size + 1;

    return rank;
  } catch (error) {
    console.error('Error getting user leaderboard position:', error);
    return null;
  }
}

/**
 * Cloud Functions ile leaderboard verilerini günceller
 */
export async function updateLeaderboardsViaCloudFunction(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await manualUpdateLeaderboards();
    const data = result.data as any;
    
    return {
      success: data.success,
      message: data.message || 'Leaderboards updated successfully'
    };
  } catch (error) {
    console.error('Error updating leaderboards via Cloud Function:', error);
    return {
      success: false,
      message: 'Leaderboard güncelleme hatası'
    };
  }
}

/**
 * Leaderboard güncelleme zamanlarını getirir
 */
export function getLeaderboardUpdateSchedule() {
  return {
    monthly: 'Gerçek zamanlı',
    allTime: 'Gerçek zamanlı',
    description: 'Liderlik tablosu verileri anlık olarak güncellenmektedir.'
  };
}

/**
 * Leaderboard verilerini günceller (cron job için)
 */
export async function updateLeaderboards() {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Aylık leaderboard'u güncelle
    await generateMonthlyLeaderboard(currentMonth);
    
    // Tüm zamanların leaderboard'unu güncelle
    await generateAllTimeLeaderboard();
    
    console.log('Leaderboards updated successfully');
  } catch (error) {
    console.error('Error updating leaderboards:', error);
  }
}

/**
 * Aylık ödül dağıtımını gerçekleştirir
 */
export async function distributeMonthlyRewards(monthKey: string): Promise<{ success: boolean; message: string; totalRewards: number }> {
  try {
    console.log(`Distributing monthly rewards for ${monthKey}`);
    
    // Leaderboard verilerini al
    const leaderboardData = await generateMonthlyLeaderboard(monthKey);
    if (!leaderboardData) {
      return { success: false, message: 'Leaderboard verisi bulunamadı', totalRewards: 0 };
    }

    const batch = writeBatch(db);
    const rewards: RewardData[] = [];
    let totalCoinsDistributed = 0;
    let totalXpDistributed = 0;

    // Her kategori için ödül dağıt
    const categories: ('top_xp' | 'top_correct' | 'top_coin' | 'top_streak')[] = ['top_xp', 'top_correct', 'top_coin', 'top_streak'];
    
    for (const category of categories) {
      const categoryUsers = leaderboardData[category];
      
      for (const user of categoryUsers) {
        const reward = calculateReward(user.rank || 0);
        
        // Kullanıcı profili güncelle
        const userRef = doc(db, 'users', user.userId);
        batch.update(userRef, {
          coins: increment(reward.coins),
          'stats.experience': increment(reward.xp)
        });

        // Ödül kaydı oluştur
        const rewardData: RewardData = {
          userId: user.userId,
          displayName: user.displayName,
          rank: user.rank || 0,
          category,
          coinsEarned: reward.coins,
          xpEarned: reward.xp,
          awardedAt: new Date().toISOString()
        };
        
        rewards.push(rewardData);
        totalCoinsDistributed += reward.coins;
        totalXpDistributed += reward.xp;
      }
    }

    // Ödül geçmişini kaydet
    const monthlyRewards: MonthlyRewards = {
      monthKey,
      rewards,
      distributedAt: new Date().toISOString(),
      totalCoinsDistributed,
      totalXpDistributed
    };

    const rewardsRef = doc(db, 'monthlyRewards', monthKey);
    batch.set(rewardsRef, monthlyRewards);

    // Batch'i commit et
    await batch.commit();

    console.log(`Monthly rewards distributed for ${monthKey}:`, {
      totalRewards: rewards.length,
      totalCoins: totalCoinsDistributed,
      totalXp: totalXpDistributed
    });

    return {
      success: true,
      message: `${rewards.length} kullanıcıya ödül dağıtıldı`,
      totalRewards: rewards.length
    };

  } catch (error) {
    console.error('Error distributing monthly rewards:', error);
    return {
      success: false,
      message: 'Ödül dağıtım hatası: ' + error,
      totalRewards: 0
    };
  }
}

/**
 * Belirli bir ayın ödül dağıtım geçmişini getirir
 */
export async function getMonthlyRewards(monthKey: string): Promise<MonthlyRewards | null> {
  try {
    const rewardsRef = doc(db, 'monthlyRewards', monthKey);
    const rewardsSnap = await getDoc(rewardsRef);
    
    if (rewardsSnap.exists()) {
      return rewardsSnap.data() as MonthlyRewards;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting monthly rewards:', error);
    return null;
  }
}

/**
 * Kullanıcının belirli bir aydaki ödüllerini getirir
 */
export async function getUserMonthlyRewards(userId: string, monthKey: string): Promise<RewardData[]> {
  try {
    const rewards = await getMonthlyRewards(monthKey);
    if (!rewards) return [];
    
    return rewards.rewards.filter(reward => reward.userId === userId);
  } catch (error) {
    console.error('Error getting user monthly rewards:', error);
    return [];
  }
}

/**
 * Cloud Functions ile aylık ödül dağıtımını tetikler
 */
export async function distributeRewardsViaCloudFunction(monthKey: string): Promise<{ success: boolean; message: string; totalRewards: number }> {
  try {
    const functions = getFunctions();
    const distributeRewards = httpsCallable(functions, 'distributeMonthlyRewards');
    
    const result = await distributeRewards({ monthKey });
    const data = result.data as any;
    
    return {
      success: data.success,
      message: data.message || 'Ödüller başarıyla dağıtıldı',
      totalRewards: data.totalRewards || 0
    };
  } catch (error) {
    console.error('Error distributing rewards via Cloud Function:', error);
    return {
      success: false,
      message: 'Ödül dağıtım hatası',
      totalRewards: 0
    };
  }
}

/**
 * Kullanıcının gizlilik ayarlarını günceller
 */
export async function updateUserPrivacySettings(
  userId: string, 
  settings: Partial<UserPrivacySettings>
): Promise<{ success: boolean; message: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      leaderboardVisibility: settings.leaderboardVisibility || 'public',
      showInRankings: settings.showInRankings !== undefined ? settings.showInRankings : true,
      allowDataCollection: settings.allowDataCollection !== undefined ? settings.allowDataCollection : true
    });

    return {
      success: true,
      message: 'Gizlilik ayarları güncellendi'
    };
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return {
      success: false,
      message: 'Gizlilik ayarları güncellenirken hata oluştu'
    };
  }
}

/**
 * Kullanıcının gizlilik ayarlarını getirir
 */
export async function getUserPrivacySettings(userId: string): Promise<UserPrivacySettings | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        leaderboardVisibility: userData.leaderboardVisibility || 'public',
        showInRankings: userData.showInRankings !== undefined ? userData.showInRankings : true,
        allowDataCollection: userData.allowDataCollection !== undefined ? userData.allowDataCollection : true
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    return null;
  }
}

/**
 * Motivasyon mesajı oluşturur
 */
export async function generateUserMotivationMessage(
  userId: string,
  category: 'top_xp' | 'top_correct' | 'top_coin' | 'top_streak',
  period: 'monthly' | 'allTime' = 'monthly'
): Promise<MotivationMessage | null> {
  try {
    const userPosition = await getUserLeaderboardPosition(userId, category, period);
    if (!userPosition) return null;

    const leaderboard = period === 'monthly' 
      ? await generateMonthlyLeaderboard(new Date().toISOString().slice(0, 7))
      : await generateAllTimeLeaderboard();
    
    if (!leaderboard) return null;

    const categoryData = leaderboard[category];
    const userEntry = categoryData.find(entry => entry.userId === userId);
    
    if (!userEntry) return null;

    // Hedef sıralamalar
    const targets = [10, 50, 100];
    
    for (const targetRank of targets) {
      if (userEntry.rank && userEntry.rank > targetRank) {
        const targetEntry = categoryData.find((entry: LeaderboardUser) => entry.rank === targetRank);
        if (targetEntry) {
          return generateMotivationMessage(
            userEntry.rank,
            targetRank,
            userEntry.value,
            targetEntry.value,
            category
          );
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error generating motivation message:', error);
    return null;
  }
}

/**
 * Leaderboard verilerini arşivler
 */
export async function archiveLeaderboard(monthKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const leaderboardData = await generateMonthlyLeaderboard(monthKey);
    if (!leaderboardData) {
      return { success: false, message: 'Arşivlenecek veri bulunamadı' };
    }

    // Ortalama skor hesapla
    const allValues = [
      ...leaderboardData.top_xp.map((u: LeaderboardUser) => u.value),
      ...leaderboardData.top_correct.map((u: LeaderboardUser) => u.value),
      ...leaderboardData.top_coin.map((u: LeaderboardUser) => u.value),
      ...leaderboardData.top_streak.map((u: LeaderboardUser) => u.value)
    ];
    const averageScore = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;

    const archiveData: LeaderboardArchive = {
      monthKey,
      originalData: leaderboardData,
      archivedAt: new Date().toISOString(),
      totalUsers: allValues.length,
      averageScore
    };

    // Arşiv koleksiyonuna kaydet
    const archiveRef = doc(db, 'leaderboards_history', monthKey);
    await setDoc(archiveRef, archiveData);

    return {
      success: true,
      message: `${monthKey} verileri başarıyla arşivlendi`
    };
  } catch (error) {
    console.error('Error archiving leaderboard:', error);
    return {
      success: false,
      message: 'Arşivleme hatası: ' + error
    };
  }
}

/**
 * Arşivlenmiş leaderboard verilerini getirir
 */
export async function getArchivedLeaderboard(monthKey: string): Promise<LeaderboardArchive | null> {
  try {
    const archiveRef = doc(db, 'leaderboards_history', monthKey);
    const archiveSnap = await getDoc(archiveRef);
    
    if (archiveSnap.exists()) {
      return archiveSnap.data() as LeaderboardArchive;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting archived leaderboard:', error);
    return null;
  }
}

/**
 * Performans metriklerini hesaplar
 */
export async function getLeaderboardPerformanceMetrics(): Promise<PerformanceMetrics> {
  const startTime = Date.now();
  
  try {
    // Leaderboard verilerini getir
    const currentMonth = new Date().toISOString().slice(0, 7);
    const leaderboardData = await generateMonthlyLeaderboard(currentMonth);
    
    const queryTime = Date.now() - startTime;
    const dataSize = JSON.stringify(leaderboardData).length;
    const userCount = leaderboardData ? 
      leaderboardData.top_xp.length + leaderboardData.top_correct.length + 
      leaderboardData.top_coin.length + leaderboardData.top_streak.length : 0;

    return calculatePerformanceMetrics(queryTime, dataSize, userCount);
  } catch (error) {
    console.error('Error calculating performance metrics:', error);
    return calculatePerformanceMetrics(Date.now() - startTime, 0, 0);
  }
}

/**
 * Gelişmiş leaderboard sorgusu (gizlilik ayarları ile)
 */
export async function getLeaderboardWithPrivacy(
  monthKey: string,
  category: 'top_xp' | 'top_correct' | 'top_coin' | 'top_streak'
): Promise<LeaderboardUser[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('leaderboardVisibility', '==', 'public'),
      where('showInRankings', '==', true),
      orderBy('stats.experience', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const users: LeaderboardUser[] = [];
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      const value = getCategoryValue(userData, category);
      
      if (value > 0) {
        users.push({
          userId: doc.id,
          displayName: userData.displayName,
          avatar: userData.avatar,
          level: userData.stats?.level || 1,
          title: userData.stats?.rank,
          value,
          rank: 0 // Sıralama daha sonra hesaplanacak
        });
      }
    });

    // Sıralama hesapla
    users.sort((a, b) => b.value - a.value);
    users.forEach((user, index) => {
      user.rank = index + 1;
    });

    return users.slice(0, 100);
  } catch (error) {
    console.error('Error getting leaderboard with privacy:', error);
    return [];
  }
}



/**
 * Kategori değerini hesaplar
 */
function getCategoryValue(userData: any, category: string): number {
  switch (category) {
    case 'top_xp':
      return userData.stats?.experience || 0;
    case 'top_correct':
      return userData.stats?.correctAnswers || 0;
    case 'top_coin':
      return userData.coins || 0;
    case 'top_streak':
      return userData.streak?.currentStreak || 0;
    default:
      return 0;
  }
}
