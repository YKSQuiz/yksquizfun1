/**
 * Firestore Performance Test Suite
 * Cache optimizasyonlarının etkinliğini test eder
 */

import { firestoreCache } from './cacheManager';
import { persistentCache } from './persistentCache';
import { batchManager } from '../services/firebase/batchOperations';
import { cacheManagement } from './cacheManagement';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  cacheHits: number;
  cacheMisses: number;
  firestoreReads: number;
  success: boolean;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: PerformanceTestResult[];
  totalDuration: number;
  averageHitRate: number;
  totalFirestoreReads: number;
}

class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];
  private startTime: number = 0;
  private firestoreReadCount: number = 0;

  /**
   * Test başlat
   */
  startTest(testName: string): void {
    this.startTime = performance.now();
    console.log(`🧪 Test başlatılıyor: ${testName}`);
  }

  /**
   * Test bitir
   */
  endTest(testName: string, success: boolean = true, error?: string): PerformanceTestResult {
    const duration = performance.now() - this.startTime;
    const stats = firestoreCache.getStats();
    
    const result: PerformanceTestResult = {
      testName,
      duration,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      firestoreReads: this.firestoreReadCount,
      success,
      error
    };

    this.results.push(result);
    console.log(`✅ Test tamamlandı: ${testName} (${duration.toFixed(2)}ms)`);
    
    return result;
  }

  /**
   * Firestore read sayacını artır
   */
  incrementFirestoreReads(): void {
    this.firestoreReadCount++;
  }

  /**
   * Cache hit rate testi
   */
  async testCacheHitRate(): Promise<PerformanceTestResult> {
    this.startTest('Cache Hit Rate Test');
    
    try {
      // Cache'i temizle
      firestoreCache.clear();
      
      // Test verisi ekle
      const testData = { id: 'test', data: 'test data' };
      firestoreCache.set('test_key', testData);
      
      // İlk okuma (cache miss)
      const firstRead = firestoreCache.get('test_key');
      this.incrementFirestoreReads();
      
      // İkinci okuma (cache hit)
      const secondRead = firestoreCache.get('test_key');
      
      // Üçüncü okuma (cache hit)
      const thirdRead = firestoreCache.get('test_key');
      
      const success = firstRead && secondRead && thirdRead;
      
      return this.endTest('Cache Hit Rate Test', success);
    } catch (error) {
      return this.endTest('Cache Hit Rate Test', false, error as string);
    }
  }

  /**
   * Cache TTL testi
   */
  async testCacheTTL(): Promise<PerformanceTestResult> {
    this.startTest('Cache TTL Test');
    
    try {
      // Cache'i temizle
      firestoreCache.clear();
      
      // Kısa TTL ile veri ekle
      const testData = { id: 'ttl_test', data: 'ttl data' };
      firestoreCache.set('ttl_key', testData, 100); // 100ms TTL
      
      // Hemen okuma (cache hit)
      const immediateRead = firestoreCache.get('ttl_key');
      
      // TTL sonrası okuma (cache miss)
      await new Promise(resolve => setTimeout(resolve, 150));
      const expiredRead = firestoreCache.get('ttl_key');
      
      const success = immediateRead && !expiredRead;
      
      return this.endTest('Cache TTL Test', success);
    } catch (error) {
      return this.endTest('Cache TTL Test', false, error as string);
    }
  }

  /**
   * Persistent cache testi
   */
  async testPersistentCache(): Promise<PerformanceTestResult> {
    this.startTest('Persistent Cache Test');
    
    try {
      // Test verisi oluştur
      const testCache = new Map();
      testCache.set('persistent_test', { data: 'persistent data' });
      
      // Kaydet
      persistentCache.save(testCache);
      
      // Yükle
      const loadedCache = persistentCache.load();
      
      const success = loadedCache && loadedCache.has('persistent_test');
      
      return this.endTest('Persistent Cache Test', success);
    } catch (error) {
      return this.endTest('Persistent Cache Test', false, error as string);
    }
  }

  /**
   * Batch operations testi
   */
  async testBatchOperations(): Promise<PerformanceTestResult> {
    this.startTest('Batch Operations Test');
    
    try {
      // Batch'e işlemler ekle
      batchManager.updateUserStats('test_user', {
        correct: 5,
        total: 10,
        experience: 100
      });
      
      batchManager.updateDailyActivity('test_user', '2024-01-01', {
        questionsSolved: 10,
        correctAnswers: 8
      });
      
      // Batch boyutunu kontrol et
      const pendingOps = batchManager.getPendingOperationsCount();
      
      // Batch'i temizle (gerçek çalıştırmadan)
      batchManager.clear();
      
      const success = pendingOps > 0;
      
      return this.endTest('Batch Operations Test', success);
    } catch (error) {
      return this.endTest('Batch Operations Test', false, error as string);
    }
  }

  /**
   * Cache yönetimi testi
   */
  async testCacheManagement(): Promise<PerformanceTestResult> {
    this.startTest('Cache Management Test');
    
    try {
      // Cache istatistiklerini al
      const stats = cacheManagement.getCacheStats();
      
      // Cache optimizasyonu çalıştır
      cacheManagement.optimizeCache();
      
      // Cache durumunu logla
      cacheManagement.logCacheStatus();
      
      const success = stats && typeof stats.memory === 'object';
      
      return this.endTest('Cache Management Test', success);
    } catch (error) {
      return this.endTest('Cache Management Test', false, error as string);
    }
  }

  /**
   * Tüm testleri çalıştır
   */
  async runAllTests(): Promise<TestSuite> {
    console.log('🚀 Performance Test Suite başlatılıyor...');
    
    // Testleri çalıştır
    await this.testCacheHitRate();
    await this.testCacheTTL();
    await this.testPersistentCache();
    await this.testBatchOperations();
    await this.testCacheManagement();
    
    // Sonuçları hesapla
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);
    const totalCacheHits = this.results.reduce((sum, result) => sum + result.cacheHits, 0);
    const totalCacheMisses = this.results.reduce((sum, result) => sum + result.cacheMisses, 0);
    const totalFirestoreReads = this.results.reduce((sum, result) => sum + result.firestoreReads, 0);
    
    const averageHitRate = totalCacheHits + totalCacheMisses > 0 
      ? (totalCacheHits / (totalCacheHits + totalCacheMisses)) * 100 
      : 0;
    
    const testSuite: TestSuite = {
      name: 'Firestore Optimization Test Suite',
      tests: this.results,
      totalDuration,
      averageHitRate,
      totalFirestoreReads
    };
    
    this.logResults(testSuite);
    
    return testSuite;
  }

  /**
   * Test sonuçlarını logla
   */
  private logResults(testSuite: TestSuite): void {
    console.log('📊 Performance Test Results:');
    console.log('================================');
    console.log(`Test Suite: ${testSuite.name}`);
    console.log(`Total Duration: ${testSuite.totalDuration.toFixed(2)}ms`);
    console.log(`Average Hit Rate: ${testSuite.averageHitRate.toFixed(2)}%`);
    console.log(`Total Firestore Reads: ${testSuite.totalFirestoreReads}`);
    console.log('================================');
    
    testSuite.tests.forEach(test => {
      console.log(`${test.success ? '✅' : '❌'} ${test.testName}: ${test.duration.toFixed(2)}ms`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
    
    console.log('================================');
  }

  /**
   * Test sonuçlarını sıfırla
   */
  reset(): void {
    this.results = [];
    this.firestoreReadCount = 0;
  }

  /**
   * Test sonuçlarını al
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }
}

// Singleton instance
export const performanceTest = new PerformanceTestSuite();

// Yardımcı fonksiyonlar
export const runPerformanceTests = async (): Promise<TestSuite> => {
  return await performanceTest.runAllTests();
};

export const testCachePerformance = async (): Promise<void> => {
  console.log('🧪 Cache Performance Test başlatılıyor...');
  
  const startTime = performance.now();
  
  // Cache'i temizle
  firestoreCache.clear();
  
  // Test verileri ekle
  for (let i = 0; i < 100; i++) {
    firestoreCache.set(`test_key_${i}`, { id: i, data: `test data ${i}` });
  }
  
  // Cache'den oku
  for (let i = 0; i < 100; i++) {
    firestoreCache.get(`test_key_${i}`);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  const stats = firestoreCache.getStats();
  
  console.log('📊 Cache Performance Results:');
  console.log(`Duration: ${duration.toFixed(2)}ms`);
  console.log(`Hit Rate: ${stats.hitRate.toFixed(2)}%`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Cache Size: ${firestoreCache.getSize()}`);
};

export const benchmarkFirestoreOptimization = async (): Promise<void> => {
  console.log('🏁 Firestore Optimization Benchmark başlatılıyor...');
  
  const testSuite = await runPerformanceTests();
  
  // Optimizasyon etkinliğini değerlendir
  const isOptimized = testSuite.averageHitRate > 80 && testSuite.totalFirestoreReads < 10;
  
  console.log('🎯 Optimization Assessment:');
  console.log(`Hit Rate: ${testSuite.averageHitRate.toFixed(2)}% ${testSuite.averageHitRate > 80 ? '✅' : '❌'}`);
  console.log(`Firestore Reads: ${testSuite.totalFirestoreReads} ${testSuite.totalFirestoreReads < 10 ? '✅' : '❌'}`);
  console.log(`Overall: ${isOptimized ? '✅ OPTIMIZED' : '❌ NEEDS IMPROVEMENT'}`);
  
  if (isOptimized) {
    console.log('🎉 Firestore optimizasyonu başarılı! Maliyetler minimize edildi.');
  } else {
    console.log('⚠️ Firestore optimizasyonu iyileştirilebilir.');
  }
};

// Development için global fonksiyonlar
if (process.env.NODE_ENV === 'development') {
  (window as any).runPerformanceTests = runPerformanceTests;
  (window as any).testCachePerformance = testCachePerformance;
  (window as any).benchmarkFirestoreOptimization = benchmarkFirestoreOptimization;
}

export default performanceTest;
