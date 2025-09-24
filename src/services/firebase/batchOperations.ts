/**
 * Firestore Batch Operations
 * Birden fazla Firestore işlemini tek seferde yaparak maliyeti azaltır
 */

import { writeBatch, doc, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { firestoreCache } from '../../utils/cacheManager';

interface BatchOperation {
  type: 'update' | 'set' | 'delete' | 'increment';
  collection: string;
  docId: string;
  data?: any;
  merge?: boolean;
}

class FirestoreBatchManager {
  private operations: BatchOperation[] = [];
  private readonly MAX_BATCH_SIZE = 500; // Firestore batch limit

  /**
   * Batch'e işlem ekle
   */
  addOperation(operation: BatchOperation): void {
    this.operations.push(operation);
  }

  /**
   * Kullanıcı verilerini güncelle
   */
  updateUser(userId: string, updates: Record<string, any>): void {
    this.addOperation({
      type: 'update',
      collection: 'users',
      docId: userId,
      data: updates
    });
  }

  /**
   * Kullanıcı istatistiklerini güncelle
   */
  updateUserStats(userId: string, stats: {
    correct?: number;
    total?: number;
    experience?: number;
    coins?: number;
    energy?: number;
    sessionTime?: number;
  }): void {
    const updates: Record<string, any> = {};
    
    if (stats.correct !== undefined) {
      updates['stats.correctAnswers'] = increment(stats.correct);
    }
    if (stats.total !== undefined) {
      updates['stats.totalQuestions'] = increment(stats.total);
      updates['stats.totalQuizzes'] = increment(1);
    }
    if (stats.experience !== undefined) {
      updates['stats.experience'] = increment(stats.experience);
    }
    if (stats.coins !== undefined) {
      updates['coins'] = increment(stats.coins);
    }
    if (stats.energy !== undefined) {
      updates['energy'] = stats.energy;
    }
    if (stats.sessionTime !== undefined) {
      updates['totalSessionTime'] = increment(stats.sessionTime);
    }

    this.updateUser(userId, updates);
  }

  /**
   * Günlük aktivite güncelle
   */
  updateDailyActivity(userId: string, date: string, activity: {
    questionsSolved?: number;
    correctAnswers?: number;
    timeSpent?: number;
  }): void {
    const updates: Record<string, any> = {};
    
    if (activity.questionsSolved !== undefined) {
      updates[`stats.dailyActivity.${date}.questionsSolved`] = increment(activity.questionsSolved);
    }
    if (activity.correctAnswers !== undefined) {
      updates[`stats.dailyActivity.${date}.correctAnswers`] = increment(activity.correctAnswers);
    }
    if (activity.timeSpent !== undefined) {
      updates[`stats.dailyActivity.${date}.timeSpent`] = increment(activity.timeSpent);
    }

    this.updateUser(userId, updates);
  }

  /**
   * Joker kullanımını güncelle
   */
  updateJokerUsage(userId: string, jokerType: string, used: boolean = true): void {
    const updates: Record<string, any> = {};
    
    if (used) {
      updates[`jokersUsed.${jokerType}`] = increment(1);
    } else {
      updates[`jokers.${jokerType}.count`] = increment(1);
    }

    this.updateUser(userId, updates);
  }

  /**
   * Test sonucunu kaydet
   */
  saveTestResult(userId: string, subjectTopicKey: string, testNumber: number, result: {
    score: number;
    total: number;
    percentage: number;
    completed: boolean;
    attempts: number;
  }): void {
    const updates: Record<string, any> = {};
    updates[`testResults.${subjectTopicKey}.${testNumber}`] = result;

    this.updateUser(userId, updates);
  }

  /**
   * Test kilidini aç
   */
  unlockTest(userId: string, subjectTopicKey: string, testNumber: number): void {
    const updates: Record<string, any> = {};
    updates[`unlockedTests.${subjectTopicKey}`] = increment(0); // Array'e ekleme için

    this.updateUser(userId, updates);
  }

  /**
   * Batch'i çalıştır
   */
  async execute(): Promise<void> {
    if (this.operations.length === 0) {
      console.log('📊 Batch: Çalıştırılacak işlem yok');
      return;
    }

    try {
      // Batch boyutu kontrolü
      if (this.operations.length > this.MAX_BATCH_SIZE) {
        await this.executeInChunks();
        return;
      }

      const batch = writeBatch(db);
      const cacheUpdates: Array<{ userId: string; data: any }> = [];

      // Batch işlemlerini hazırla
      for (const operation of this.operations) {
        const docRef = doc(db, operation.collection, operation.docId);

        switch (operation.type) {
          case 'update':
            batch.update(docRef, operation.data);
            // Cache güncellemesi için hazırla
            if (operation.collection === 'users') {
              cacheUpdates.push({
                userId: operation.docId,
                data: operation.data
              });
            }
            break;
          case 'set':
            batch.set(docRef, operation.data, { merge: operation.merge });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          case 'increment':
            batch.update(docRef, operation.data);
            break;
        }
      }

      // Batch'i çalıştır
      await batch.commit();
      console.log(`✅ Batch: ${this.operations.length} işlem başarıyla tamamlandı`);

      // Cache'i güncelle
      for (const cacheUpdate of cacheUpdates) {
        const cachedUser = firestoreCache.getUserData(cacheUpdate.userId);
        if (cachedUser) {
          // Cache'deki kullanıcı verisini güncelle
          Object.assign(cachedUser, cacheUpdate.data);
          firestoreCache.setUserData(cacheUpdate.userId, cachedUser);
        }
      }

      // Operations'ı temizle
      this.operations = [];

    } catch (error) {
      console.error('❌ Batch işlemi başarısız:', error);
      throw error;
    }
  }

  /**
   * Büyük batch'leri parçalara bölerek çalıştır
   */
  private async executeInChunks(): Promise<void> {
    const chunks = [];
    for (let i = 0; i < this.operations.length; i += this.MAX_BATCH_SIZE) {
      chunks.push(this.operations.slice(i, i + this.MAX_BATCH_SIZE));
    }

    console.log(`📊 Batch: ${chunks.length} parçaya bölündü`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const tempManager = new FirestoreBatchManager();
      tempManager.operations = chunk;
      
      try {
        await tempManager.execute();
        console.log(`✅ Batch parça ${i + 1}/${chunks.length} tamamlandı`);
      } catch (error) {
        console.error(`❌ Batch parça ${i + 1} başarısız:`, error);
        throw error;
      }
    }

    this.operations = [];
  }

  /**
   * Bekleyen işlem sayısını al
   */
  getPendingOperationsCount(): number {
    return this.operations.length;
  }

  /**
   * Batch'i temizle
   */
  clear(): void {
    this.operations = [];
  }

  /**
   * Batch durumunu logla
   */
  logStatus(): void {
    console.log('📊 Batch Status:', {
      pendingOperations: this.operations.length,
      maxBatchSize: this.MAX_BATCH_SIZE,
      operations: this.operations.map(op => ({
        type: op.type,
        collection: op.collection,
        docId: op.docId
      }))
    });
  }
}

// Singleton instance
export const batchManager = new FirestoreBatchManager();

// Yardımcı fonksiyonlar
export const batchUpdateUserStats = async (
  userId: string, 
  stats: {
    correct?: number;
    total?: number;
    experience?: number;
    coins?: number;
    energy?: number;
    sessionTime?: number;
  }
): Promise<void> => {
  batchManager.updateUserStats(userId, stats);
  await batchManager.execute();
};

export const batchUpdateDailyActivity = async (
  userId: string,
  date: string,
  activity: {
    questionsSolved?: number;
    correctAnswers?: number;
    timeSpent?: number;
  }
): Promise<void> => {
  batchManager.updateDailyActivity(userId, date, activity);
  await batchManager.execute();
};

export const batchSaveTestResult = async (
  userId: string,
  subjectTopicKey: string,
  testNumber: number,
  result: {
    score: number;
    total: number;
    percentage: number;
    completed: boolean;
    attempts: number;
  }
): Promise<void> => {
  batchManager.saveTestResult(userId, subjectTopicKey, testNumber, result);
  await batchManager.execute();
};

export const batchUnlockTest = async (
  userId: string,
  subjectTopicKey: string,
  testNumber: number
): Promise<void> => {
  batchManager.unlockTest(userId, subjectTopicKey, testNumber);
  await batchManager.execute();
};

// Periyodik batch çalıştırma
export const startBatchProcessor = (intervalMs: number = 30000): () => void => {
  const interval = setInterval(async () => {
    if (batchManager.getPendingOperationsCount() > 0) {
      try {
        await batchManager.execute();
        console.log('📊 Periyodik batch işlemi tamamlandı');
      } catch (error) {
        console.error('❌ Periyodik batch işlemi başarısız:', error);
      }
    }
  }, intervalMs);

  // Cleanup fonksiyonu
  return () => {
    clearInterval(interval);
    // Son kez çalıştır
    if (batchManager.getPendingOperationsCount() > 0) {
      batchManager.execute();
    }
  };
};

export default batchManager;
