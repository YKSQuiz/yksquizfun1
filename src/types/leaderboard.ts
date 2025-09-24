// Leaderboard sistemi için tip tanımları

export interface LeaderboardUser {
  userId: string;
  displayName: string;
  avatar: string;
  level: number;
  title?: string;
  value: number; // XP, doğru sayısı, coin veya streak değeri
  rank?: number; // Sıralama pozisyonu
}

export interface LeaderboardData {
  top_xp: LeaderboardUser[];
  top_correct: LeaderboardUser[];
  top_coin: LeaderboardUser[];
  top_streak: LeaderboardUser[];
  generatedAt: string; // ISO timestamp
}

export interface MonthlyLeaderboard {
  [monthKey: string]: LeaderboardData; // "2025-01", "2025-02" formatında
}

export interface LeaderboardCategory {
  key: 'top_xp' | 'top_correct' | 'top_coin' | 'top_streak';
  title: string;
  description: string;
  icon: string;
}

export const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  {
    key: 'top_xp',
    title: 'XP',
    description: 'En çok deneyim puanı kazananlar',
    icon: '⭐'
  },
  {
    key: 'top_correct',
    title: 'Doğru Cevap',
    description: 'En fazla doğru cevap verenler',
    icon: '✅'
  },
  {
    key: 'top_coin',
    title: 'Coin',
    description: 'En fazla coin biriktirenler',
    icon: '🪙'
  },
  {
    key: 'top_streak',
    title: 'Streak',
    description: 'En uzun giriş serisi yapanlar',
    icon: '🔥'
  }
];

export interface LeaderboardPeriod {
  key: 'monthly' | 'allTime';
  title: string;
  description: string;
}

export const LEADERBOARD_PERIODS: LeaderboardPeriod[] = [
  { key: 'monthly', title: 'Aylık', description: 'Bu ayın en iyileri' },
  { key: 'allTime', title: 'Tüm Zamanlar', description: 'Tüm zamanların en iyileri' }
];

// Ödül Sistemi Tipleri
export interface RewardTier {
  rank: number;
  coins: number;
  xp: number;
}

export interface RewardData {
  userId: string;
  displayName: string;
  rank: number;
  category: 'top_xp' | 'top_correct' | 'top_coin' | 'top_streak';
  coinsEarned: number;
  xpEarned: number;
  awardedAt: string;
}

export interface MonthlyRewards {
  monthKey: string; // "2025-01" formatında
  rewards: RewardData[];
  distributedAt: string;
  totalCoinsDistributed: number;
  totalXpDistributed: number;
}

// Ödül Şeması Sabitleri
export const REWARD_TIERS: RewardTier[] = [
  { rank: 1, coins: 10000, xp: 10000 },
  { rank: 2, coins: 5000, xp: 5000 },
  { rank: 3, coins: 2500, xp: 2500 },
  { rank: 4, coins: 1000, xp: 1000 },
  { rank: 5, coins: 900, xp: 900 },
  { rank: 6, coins: 800, xp: 800 },
  { rank: 7, coins: 700, xp: 700 },
  { rank: 8, coins: 600, xp: 600 },
  { rank: 9, coins: 500, xp: 500 },
  { rank: 10, coins: 500, xp: 500 }
];

// 11-100 arası sabit ödül
export const DEFAULT_REWARD = { coins: 100, xp: 100 };

/**
 * Belirli bir sıra için ödül miktarını hesaplar
 */
export function calculateReward(rank: number): { coins: number; xp: number } {
  if (rank <= 10) {
    const tier = REWARD_TIERS.find(t => t.rank === rank);
    return tier ? { coins: tier.coins, xp: tier.xp } : DEFAULT_REWARD;
  }
  
  return DEFAULT_REWARD;
}

// Performans Optimizasyonu ve Genişletme Tipleri
export interface UserPrivacySettings {
  leaderboardVisibility: 'public' | 'private';
  showInRankings: boolean;
  allowDataCollection: boolean;
}

export interface MotivationMessage {
  type: 'encouragement' | 'achievement' | 'goal';
  message: string;
  targetRank?: number;
  requiredPoints?: number;
  category?: 'top_xp' | 'top_correct' | 'top_coin' | 'top_streak';
}

export interface LeaderboardArchive {
  monthKey: string;
  originalData: LeaderboardData;
  archivedAt: string;
  totalUsers: number;
  averageScore: number;
}

export interface PerformanceMetrics {
  queryTime: number;
  dataSize: number;
  cacheHitRate: number;
  userCount: number;
  lastUpdated: string;
}

// Motivasyon Mesajları Sabitleri
export const MOTIVATION_MESSAGES: Record<string, MotivationMessage[]> = {
  nearTop10: [
    {
      type: 'encouragement',
      message: 'Sadece {count} kişi önünde! {points} {category} kazanarak ilk 10\'a girebilirsin!',
      targetRank: 10
    }
  ],
  nearTop100: [
    {
      type: 'encouragement',
      message: 'İlk 100\'e çok yakınsın! Biraz daha çalışarak sıralamada yüksel!',
      targetRank: 100
    }
  ],
  improving: [
    {
      type: 'achievement',
      message: 'Harika ilerleme! Sıralamanda {rank} sıra yükseldin!'
    }
  ],
  newRecord: [
    {
      type: 'achievement',
      message: 'Yeni rekor! Bu ay {category} kategorisinde en iyi performansını gösterdin!'
    }
  ]
};

/**
 * Kullanıcı için motivasyon mesajı oluşturur
 */
export function generateMotivationMessage(
  currentRank: number,
  targetRank: number,
  currentValue: number,
  targetValue: number,
  category: string
): MotivationMessage | null {
  const difference = targetValue - currentValue;
  const rankDifference = targetRank - currentRank;
  
  if (rankDifference <= 3 && rankDifference > 0) {
    return {
      type: 'encouragement',
      message: `Sadece ${rankDifference} kişi önünde! ${difference.toLocaleString()} ${getCategoryDisplayName(category)} kazanarak ilk ${targetRank}'a girebilirsin!`,
      targetRank,
      requiredPoints: difference,
      category: category as any
    };
  }
  
  return null;
}

/**
 * Kategori adını görüntüleme formatına çevirir
 */
export function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'top_xp': return 'XP';
    case 'top_correct': return 'doğru cevap';
    case 'top_coin': return 'coin';
    case 'top_streak': return 'gün streak';
    default: return 'puan';
  }
}

/**
 * Performans metrikleri hesaplar
 */
export function calculatePerformanceMetrics(
  queryTime: number,
  dataSize: number,
  userCount: number
): PerformanceMetrics {
  return {
    queryTime,
    dataSize,
    cacheHitRate: 0.85, // Varsayılan cache hit rate
    userCount,
    lastUpdated: new Date().toISOString()
  };
}
