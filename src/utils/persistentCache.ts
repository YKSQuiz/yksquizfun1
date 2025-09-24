/**
 * Persistent Cache Manager
 * Tarayıcı kapatılıp açıldığında cache'in korunması için localStorage entegrasyonu
 */

interface PersistentCacheData {
  timestamp: number;
  version: string;
  data: Array<[string, any]>;
}

class PersistentCache {
  private readonly STORAGE_KEY = 'yksquiz_firestore_cache';
  private readonly VERSION = '1.0.0';
  private readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 saat
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB maksimum storage boyutu

  /**
   * Cache'i localStorage'a kaydet
   */
  save(cache: Map<string, any>): void {
    try {
      const cacheData: PersistentCacheData = {
        timestamp: Date.now(),
        version: this.VERSION,
        data: Array.from(cache.entries())
      };

      const serialized = JSON.stringify(cacheData);
      
      // Storage boyutu kontrolü
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        console.warn('Cache boyutu çok büyük, kaydedilemedi');
        return;
      }

      localStorage.setItem(this.STORAGE_KEY, serialized);
      console.log('✅ Cache localStorage\'a kaydedildi');
    } catch (error) {
      console.warn('❌ Cache kaydedilemedi:', error);
      // Storage dolu olabilir, eski cache'i temizle
      this.clear();
    }
  }

  /**
   * Cache'i localStorage'dan yükle
   */
  load(): Map<string, any> | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('📝 localStorage\'da cache bulunamadı');
        return null;
      }

      const cacheData: PersistentCacheData = JSON.parse(stored);
      
      // Versiyon kontrolü
      if (cacheData.version !== this.VERSION) {
        console.log('🔄 Cache versiyonu eski, temizleniyor');
        this.clear();
        return null;
      }

      // Yaş kontrolü
      const age = Date.now() - cacheData.timestamp;
      if (age > this.MAX_AGE) {
        console.log('⏰ Cache çok eski, temizleniyor');
        this.clear();
        return null;
      }

      const cache = new Map(cacheData.data);
      console.log(`✅ Cache localStorage'dan yüklendi (${cache.size} giriş)`);
      return cache;
    } catch (error) {
      console.warn('❌ Cache yüklenemedi:', error);
      this.clear();
      return null;
    }
  }

  /**
   * Cache'i localStorage'dan temizle
   */
  clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cache localStorage\'dan temizlendi');
    } catch (error) {
      console.warn('❌ Cache temizlenemedi:', error);
    }
  }

  /**
   * Storage kullanımını kontrol et
   */
  getStorageUsage(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }
      
      // Tarayıcı storage limiti genellikle 5-10MB
      const available = 10 * 1024 * 1024; // 10MB varsayılan
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Storage durumunu logla
   */
  logStorageStatus(): void {
    const usage = this.getStorageUsage();
    console.log('💾 Storage Status:', {
      used: `${(usage.used / 1024 / 1024).toFixed(2)}MB`,
      available: `${(usage.available / 1024 / 1024).toFixed(2)}MB`,
      percentage: `${usage.percentage.toFixed(2)}%`
    });
  }

  /**
   * Belirli bir pattern'e uyan localStorage girişlerini temizle
   */
  clearByPattern(pattern: string): void {
    try {
      const regex = new RegExp(pattern);
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && regex.test(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`🗑️ ${keysToRemove.length} localStorage girişi temizlendi`);
    } catch (error) {
      console.warn('❌ Pattern temizleme başarısız:', error);
    }
  }

  /**
   * Kullanıcıya ait tüm localStorage girişlerini temizle
   */
  clearUserData(userId: string): void {
    this.clearByPattern(`.*_${userId}_.*`);
  }

  /**
   * Cache'i otomatik olarak periyodik kaydet
   */
  startAutoSave(cache: Map<string, any>, intervalMs: number = 5 * 60 * 1000): () => void {
    const saveInterval = setInterval(() => {
      this.save(cache);
    }, intervalMs);

    // Cleanup fonksiyonu döndür
    return () => {
      clearInterval(saveInterval);
      // Son kez kaydet
      this.save(cache);
    };
  }
}

// Singleton instance
export const persistentCache = new PersistentCache();

// Cache'i otomatik yönetmek için yardımcı fonksiyonlar
export const initializePersistentCache = (cache: Map<string, any>) => {
  // Mevcut cache'i yükle
  const loadedCache = persistentCache.load();
  if (loadedCache) {
    // Yüklenen cache'i mevcut cache ile birleştir
    for (const [key, value] of loadedCache.entries()) {
      cache.set(key, value);
    }
  }

  // Otomatik kaydetmeyi başlat
  const cleanup = persistentCache.startAutoSave(cache);
  
  // Sayfa kapatılırken cache'i kaydet
  const handleBeforeUnload = () => {
    persistentCache.save(cache);
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Cleanup fonksiyonu döndür
  return () => {
    cleanup();
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

export default persistentCache;
