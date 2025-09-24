const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } = require('firebase/firestore');

// ✅ GÜVENLİ: Environment variables kullanılıyor
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Environment variables kontrolü
if (!firebaseConfig.apiKey) {
  console.error('❌ Firebase API key bulunamadı!');
  console.error('📋 .env dosyasını kontrol edin');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Quiz history'den toplam süreyi hesaplar
 * @param {Array} quizHistory - Quiz geçmişi
 * @returns {number} Toplam süre (saniye)
 */
function calculateTotalQuizTime(quizHistory) {
  if (!Array.isArray(quizHistory)) return 0;
  
  return quizHistory.reduce((acc, quiz) => {
    return acc + (quiz.duration || 0);
  }, 0);
}

/**
 * Kullanıcının session time verilerini düzeltir
 * @param {Object} userData - Kullanıcı verisi
 * @returns {number} Doğru session time değeri
 */
function calculateCorrectSessionTime(userData) {
  const quizSeconds = calculateTotalQuizTime(userData.stats?.quizHistory);
  const prevSession = userData.stats?.totalSessionTime || 0;
  
  // Kümülatif olarak quiz süresi ve varsa eski session süresi toplanır
  return Math.max(prevSession, quizSeconds);
}

/**
 * Session time verilerini düzeltir
 * @param {boolean} dryRun - Gerçek güncelleme yapmadan önce kontrol
 */
async function fixSessionTimes(dryRun = false) {
  try {
    console.log('🔄 Session time verilerini düzeltme başlatılıyor...');
    
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    console.log(`📊 Toplam ${usersSnap.size} kullanıcı bulundu.`);
    
    let updatedCount = 0;
    let processedCount = 0;
    const batchSize = 500;
    const userDocs = usersSnap.docs;
    
    // Kullanıcıları batch'ler halinde işle
    for (let i = 0; i < userDocs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = userDocs.slice(i, i + batchSize);
      let batchUpdates = 0;
      
      for (const userDoc of batchDocs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        processedCount++;
        
        console.log(`\n👤 Kullanıcı işleniyor: ${userId} (${processedCount}/${userDocs.length})`);
        
        const newSessionTime = calculateCorrectSessionTime(userData);
        const currentSessionTime = userData.stats?.totalSessionTime || 0;
        
        console.log(`  📊 Mevcut session time: ${currentSessionTime} sn`);
        console.log(`  📊 Yeni session time: ${newSessionTime} sn`);
        
        if (newSessionTime !== currentSessionTime) {
          if (!dryRun) {
            batch.update(doc(db, 'users', userId), {
              'stats.totalSessionTime': newSessionTime
            });
            batchUpdates++;
          }
          console.log(`  ✅ Güncellendi: ${currentSessionTime} → ${newSessionTime} sn`);
        } else {
          console.log(`  ⏭️ Değişiklik gerekmiyor`);
        }
        
        updatedCount++;
      }
      
      if (!dryRun && batchUpdates > 0) {
        await batch.commit();
        console.log(`💾 Batch kaydedildi: ${batchUpdates} güncelleme`);
      }
      
      // Progress göster
      const progress = ((i + batchSize) / userDocs.length * 100).toFixed(1);
      console.log(`📈 İlerleme: %${Math.min(progress, 100)}`);
    }
    
    console.log('\n🎉 Tüm kullanıcılar için session time düzeltmeleri tamamlandı!');
    console.log(`📊 Toplam işlenen kullanıcı: ${updatedCount}`);
    
    if (dryRun) {
      console.log(`🔍 DRY RUN MODU - Gerçek güncelleme yapılmadı`);
    }
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error.message);
    throw error;
  }
}

// Ana fonksiyon
async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log('📖 Kullanım:');
      console.log('  node fixSessionTimes.js [--dry-run]');
      console.log('');
      console.log('Seçenekler:');
      console.log('  --dry-run    Gerçek güncelleme yapmadan önce kontrol et');
      console.log('  --help, -h   Bu yardımı göster');
      return;
    }
    
    await fixSessionTimes(dryRun);
    
  } catch (error) {
    console.error('❌ Kritik hata:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Script'i çalıştır
if (require.main === module) {
  main();
} 