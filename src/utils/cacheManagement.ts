/**
 * Cache Management Utilities
 * Cache temizleme, yönetim ve optimizasyon fonksiyonları
 */

import { firestoreCache } from './cacheManager';
import { persistentCache } from './persistentCache';
import { batchManager } from '../services/firebase/batchOperations';

interface CacheManagementConfig {
  autoCleanupInterval: number; // ms
  maxCacheAge: number; // ms
  maxCacheSize: number;
  enablePersistentCache: boolean;
  enableBatchProcessing: boolean;
}

const DEFAULT_CONFIG: CacheManagementConfig = {
  autoCleanupInterval: 10 * 60 * 1000, // 10 dakika
  maxCacheAge: 30 * 60 * 1000, // 30 dakika
  maxCacheSize: 100,
  enablePersistentCache: true,
  enableBatchProcessing: true
};

class CacheManagementService {
  private config: CacheManagementConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private batchProcessor: (() => void) | null = null;

  constructor(config: Partial<CacheManagementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Cache yönetim servisini başlat
   */
  start(): void {
    console.log('🚀 Cache Management Service başlatılıyor...');
    
    // Otomatik temizlik
    this.startAutoCleanup();
    
    // Persistent cache
    if (this.config.enablePersistentCache) {
      this.initializePersistentCache();
    }
    
    // Batch processing
    if (this.config.enableBatchProcessing) {
      this.startBatchProcessing();
    }
    
    console.log('✅ Cache Management Service başlatıldı');
  }

  /**
   * Cache yönetim servisini durdur
   */
  stop(): void {
    console.log('🛑 Cache Management Service durduruluyor...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.batchProcessor) {
      this.batchProcessor();
      this.batchProcessor = null;
    }
    
    console.log('✅ Cache Management Service durduruldu');
  }

  /**
   * Otomatik cache temizliği başlat
   */
  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.autoCleanupInterval);
  }

  /**
   * Cache temizliği yap
   */
  performCleanup(): void {
    console.log('🧹 Cache temizliği başlatılıyor...');
    
    const stats = firestoreCache.getStats();
    const size = firestoreCache.getSize();
    
    // Eski cache girişlerini temizle
    this.cleanExpiredEntries();
    
    // Cache boyutunu kontrol et
    if (size > this.config.maxCacheSize) {
      this.cleanupBySize();
    }
    
    // Persistent cache'i güncelle
    if (this.config.enablePersistentCache) {
      this.updatePersistentCache();
    }
    
    console.log('✅ Cache temizliği tamamlandı', {
      beforeSize: size,
      afterSize: firestoreCache.getSize(),
      hitRate: `${stats.hitRate.toFixed(2)}%`
    });
  }

  /**
   * Süresi dolmuş cache girişlerini temizle
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    const cache = firestoreCache['cache']; // Private property'e erişim
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
      }
    }
  }

  /**
   * Cache boyutuna göre temizlik yap
   */
  private cleanupBySize(): void {
    const cache = firestoreCache['cache'];
    const entries = Array.from(cache.entries());
    
    // En az kullanılan girişleri bul
    entries.sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;
      
      // Önce erişim sayısına göre, sonra timestamp'e göre sırala
      if (entryA.accessCount !== entryB.accessCount) {
        return entryA.accessCount - entryB.accessCount;
      }
      return entryA.timestamp - entryB.timestamp;
    });
    
    // %20'sini temizle
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  /**
   * Persistent cache'i güncelle
   */
  private updatePersistentCache(): void {
    if (this.config.enablePersistentCache) {
      const cache = firestoreCache['cache'];
      persistentCache.save(cache);
    }
  }

  /**
   * Persistent cache'i başlat
   */
  private initializePersistentCache(): void {
    const loadedCache = persistentCache.load();
    if (loadedCache) {
      const cache = firestoreCache['cache'];
      for (const [key, value] of loadedCache.entries()) {
        cache.set(key, value);
      }
      console.log('📦 Persistent cache yüklendi');
    }
  }

  /**
   * Batch processing başlat
   */
  private startBatchProcessing(): void {
    const { startBatchProcessor } = require('../services/firebase/batchOperations');
    this.batchProcessor = startBatchProcessor(30000); // 30 saniye
  }

  /**
   * Kullanıcıya ait cache'i temizle
   */
  clearUserCache(userId: string): void {
    firestoreCache.clearUserCache(userId);
    persistentCache.clearUserData(userId);
    console.log(`🗑️ Kullanıcı ${userId} cache'i temizlendi`);
  }

  /**
   * Belirli bir pattern'e uyan cache'i temizle
   */
  clearByPattern(pattern: string): void {
    firestoreCache.clearByPattern(pattern);
    persistentCache.clearByPattern(pattern);
    console.log(`🗑️ Pattern "${pattern}" cache'i temizlendi`);
  }

  /**
   * Tüm cache'i temizle
   */
  clearAllCache(): void {
    firestoreCache.clear();
    persistentCache.clear();
    batchManager.clear();
    console.log('🗑️ Tüm cache temizlendi');
  }

  /**
   * Cache istatistiklerini al
   */
  getCacheStats(): {
    memory: any;
    persistent: any;
    batch: number;
  } {
    return {
      memory: firestoreCache.getStats(),
      persistent: persistentCache.getStorageUsage(),
      batch: batchManager.getPendingOperationsCount()
    };
  }

  /**
   * Cache durumunu logla
   */
  logCacheStatus(): void {
    const stats = this.getCacheStats();
    console.log('📊 Cache Status:', {
      memory: {
        size: firestoreCache.getSize(),
        hitRate: `${stats.memory.hitRate.toFixed(2)}%`,
        totalRequests: stats.memory.totalRequests
      },
      persistent: {
        used: `${(stats.persistent.used / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${stats.persistent.percentage.toFixed(2)}%`
      },
      batch: {
        pendingOperations: stats.batch
      }
    });
  }

  /**
   * Cache performansını optimize et
   */
  optimizeCache(): void {
    console.log('⚡ Cache optimizasyonu başlatılıyor...');
    
    // Eski girişleri temizle
    this.cleanExpiredEntries();
    
    // Boyut optimizasyonu
    if (firestoreCache.getSize() > this.config.maxCacheSize) {
      this.cleanupBySize();
    }
    
    // Persistent cache'i güncelle
    this.updatePersistentCache();
    
    // Batch işlemlerini çalıştır
    if (batchManager.getPendingOperationsCount() > 0) {
      batchManager.execute();
    }
    
    console.log('✅ Cache optimizasyonu tamamlandı');
  }

  /**
   * Konfigürasyonu güncelle
   */
  updateConfig(newConfig: Partial<CacheManagementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Cache konfigürasyonu güncellendi:', this.config);
  }
}

// Singleton instance
export const cacheManagement = new CacheManagementService();

// Yardımcı fonksiyonlar
export const initializeCacheManagement = (config?: Partial<CacheManagementConfig>): void => {
  if (config) {
    cacheManagement.updateConfig(config);
  }
  cacheManagement.start();
};

export const cleanupCache = (): void => {
  cacheManagement.performCleanup();
};

export const clearUserCache = (userId: string): void => {
  cacheManagement.clearUserCache(userId);
};

export const clearAllCache = (): void => {
  cacheManagement.clearAllCache();
};

export const getCacheStats = () => {
  return cacheManagement.getCacheStats();
};

export const logCacheStatus = (): void => {
  cacheManagement.logCacheStatus();
};

export const optimizeCache = (): void => {
  cacheManagement.optimizeCache();
};

// Development için debug fonksiyonları
export const debugCache = {
  logStatus: () => cacheManagement.logCacheStatus(),
  clearAll: () => cacheManagement.clearAllCache(),
  optimize: () => cacheManagement.optimizeCache(),
  stats: () => cacheManagement.getCacheStats()
};

// Global window objesine ekle (development için)
if (process.env.NODE_ENV === 'development') {
  (window as any).debugCache = debugCache;
}

export default cacheManagement;
