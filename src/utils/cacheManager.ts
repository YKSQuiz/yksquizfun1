/**
 * Firestore Cache Manager
 * Firestore Read giderlerini minimize etmek için gelişmiş cache sistemi
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number; // LRU için erişim sayısı
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

class FirestoreCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 dakika
  private readonly MAX_CACHE_SIZE = 100; // Maksimum cache boyutu
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0
  };

  /**
   * Cache'e veri ekle
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Cache boyutu kontrolü
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
      accessCount: 0
    });
  }

  /**
   * Cache'den veri al
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // TTL kontrolü
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Erişim sayısını artır (LRU için)
    entry.accessCount++;
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }

  /**
   * Cache'den veri sil
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Cache'i temizle
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0
    };
  }

  /**
   * Cache istatistiklerini al
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Cache boyutunu al
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Kullanıcı verileri için özel cache metodları
   */
  setUserData(userId: string, userData: any): void {
    this.set(`user_${userId}`, userData, 2 * 60 * 1000); // 2 dakika TTL
  }

  getUserData(userId: string): any | null {
    return this.get(`user_${userId}`);
  }

  /**
   * Soru verileri için özel cache metodları
   */
  setQuestions(topicId: string, testNumber: number, questions: any[]): void {
    const key = `questions_${topicId}_${testNumber}`;
    this.set(key, questions, 30 * 60 * 1000); // 30 dakika TTL
  }

  getQuestions(topicId: string, testNumber: number): any[] | null {
    const key = `questions_${topicId}_${testNumber}`;
    return this.get(key);
  }

  /**
   * Test sonuçları için özel cache metodları
   */
  setTestResults(userId: string, subjectTopicKey: string, testResults: any): void {
    const key = `testResults_${userId}_${subjectTopicKey}`;
    this.set(key, testResults, 5 * 60 * 1000); // 5 dakika TTL
  }

  getTestResults(userId: string, subjectTopicKey: string): any | null {
    const key = `testResults_${userId}_${subjectTopicKey}`;
    return this.get(key);
  }

  /**
   * Açılan testler için özel cache metodları
   */
  setUnlockedTests(userId: string, subjectTopicKey: string, unlockedTests: number[]): void {
    const key = `unlockedTests_${userId}_${subjectTopicKey}`;
    this.set(key, unlockedTests, 5 * 60 * 1000); // 5 dakika TTL
  }

  getUnlockedTests(userId: string, subjectTopicKey: string): number[] | null {
    const key = `unlockedTests_${userId}_${subjectTopicKey}`;
    return this.get(key);
  }

  /**
   * En az kullanılan cache girişini sil (LRU)
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastAccessCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Önce erişim sayısına göre, sonra timestamp'e göre karar ver
      if (entry.accessCount < leastAccessCount || 
          (entry.accessCount === leastAccessCount && entry.timestamp < oldestTimestamp)) {
        leastUsedKey = key;
        leastAccessCount = entry.accessCount;
        oldestTimestamp = entry.timestamp;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * Hit rate'i güncelle
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = (this.stats.hits / this.stats.totalRequests) * 100;
    }
  }

  /**
   * Cache durumunu logla (debug için)
   */
  logCacheStatus(): void {
    console.log('📊 Cache Status:', {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      stats: this.stats,
      keys: Array.from(this.cache.keys())
    });
  }

  /**
   * Belirli bir pattern'e uyan cache girişlerini temizle
   */
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Kullanıcıya ait tüm cache girişlerini temizle
   */
  clearUserCache(userId: string): void {
    this.clearByPattern(`^.*_${userId}_.*$`);
    this.delete(`user_${userId}`);
  }
}

// Singleton instance
export const firestoreCache = new FirestoreCache();

// Cache performansını izlemek için
export const logCachePerformance = () => {
  const stats = firestoreCache.getStats();
  console.log('🚀 Cache Performance:', {
    hitRate: `${stats.hitRate.toFixed(2)}%`,
    totalRequests: stats.totalRequests,
    hits: stats.hits,
    misses: stats.misses,
    cacheSize: firestoreCache.getSize()
  });
};

// Periyodik cache temizliği
export const startCacheCleanup = () => {
  // Her 10 dakikada bir cache'i temizle
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of firestoreCache['cache'].entries()) {
      if (now - entry.timestamp > entry.ttl) {
        firestoreCache.delete(key);
      }
    }
    logCachePerformance();
  }, 10 * 60 * 1000);
};

export default firestoreCache;