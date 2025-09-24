// Kullanıcı tipi
export interface User {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  stats: UserStats;
  jokers: Jokers;
  jokersUsed: JokersUsed;
  totalSessionTime?: number;
  totalQuizTime?: number;
  // Kullanıcı bazlı leaderboard alanları
  leaderboard?: {
    // Eski alanlar (geriye dönük uyumluluk için tutulur)
    topxp?: number;
    topcorrect?: number;
    topcoin?: number;
    topstreak?: number;
    // Yeni yapı
    allTime?: {
      topxp?: number;
      topcorrect?: number;
      topcoin?: number;
      topstreak?: number;
      updatedAt?: string;
    };
    month?: {
      topxp?: number;
      topcorrect?: number;
      topcoin?: number;
      topstreak?: number;
      periodStart?: string;
      periodEnd?: string;
      updatedAt?: string;
    };
    updatedAt?: string;
  };
  // Enerji sistemi
  energy?: number; // Kullanıcının mevcut enerjisi (0-100)
  lastEnergyUpdate?: string; // Son enerji güncelleme zamanı (ISO string veya timestamp)
  energyLimit?: number; // Maksimum enerji (varsayılan: 100)
  energyRegenSpeed?: number; // Enerji yenilenme hızı (saniye, varsayılan: 300)
  coins?: number; // Kullanıcının sahip olduğu coin miktarı
  // Streak sistemi
  streak?: {
    currentStreak: number; // Mevcut streak sayısı
    longestStreak: number; // En uzun streak
    lastLoginDate: string; // Son giriş tarihi (ISO string)
    totalCoinsEarned: number; // Streak'ten kazanılan toplam coin
  };
  unlockedTests?: { [subjectTopic: string]: number[] }; // Alt konu bazlı açılan testler {"turkce/sozcukte-anlam": [1,2], "matematik/temel-kavramlar": [1]}
  testResults?: { [subjectTopic: string]: { [testId: string]: { score: number; total: number; percentage: number; completed: boolean; attempts: number } } }; // Test sonuçları

  // Davet Sistemi
  referral?: {
    code: string;                  // Her kullanıcı için benzersiz, paylaşılabilir davet kodu
    invitedBy: string | null;      // Bu kullanıcıyı kimin davet ettiğinin UID'si
    
    // Liderlik tablosu için anlık çekilecek veri
    allTimeInvites: number;        // Tüm zamanlardaki toplam başarılı davet sayısı
    monthlyInvites: {
      [monthKey: string]: number; // Aylık bazda davet sayısı (Örn: {"2024-08": 12})
    };
  };
}

// Kullanıcı istatistikleri
export interface UserStats {
  totalQuizzes: number;
  correctAnswers: number;
  totalQuestions: number;
  dailyActivity: {
    [date: string]: {
      questionsSolved: number;
      correctAnswers: number;
    };
  };
  level: number;
  experience: number;
  experienceToNext: number;
  rank?: string;
  totalQuizTime?: number;
  totalSessionTime?: number;
  sessionHistory?: { date: string; seconds: number }[];
}

export interface JokerState {
  count: number;
  lastReset: string; // ISO date
}

export interface Jokers {
  eliminate: JokerState;
  extraTime: JokerState;
  doubleAnswer: JokerState;
  autoCorrect: JokerState;
}

export interface JokersUsed {
  eliminate: number;
  extraTime: number;
  doubleAnswer: number;
  autoCorrect: number;
} 