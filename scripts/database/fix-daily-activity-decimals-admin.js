const admin = require('firebase-admin');
const path = require('path');

// Service account key dosyasını güvenli şekilde yükle
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json dosyası bulunamadı!');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Firebase Admin SDK'yı başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Sayıyı 2 ondalık basamağa yuvarlar
 * @param {number} num - Yuvarlanacak sayı
 * @returns {number} Yuvarlanmış sayı
 */
function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Kullanıcının daily activity verilerini düzeltir
 * @param {Object} userData - Kullanıcı verisi
 * @returns {Object|null} Düzeltilmiş daily activity verisi veya null
 */
function fixUserDailyActivity(userData) {
  if (!userData.stats?.dailyActivity || typeof userData.stats.dailyActivity !== 'object') {
    return null;
  }
  
  const dailyActivity = userData.stats.dailyActivity;
  let needsUpdate = false;
  const updatedDailyActivity = {};
  
  // Her gün için timeSpent'i kontrol et ve düzelt
  for (const [date, dayData] of Object.entries(dailyActivity)) {
    if (dayData && typeof dayData.timeSpent === 'number') {
      const originalTimeSpent = dayData.timeSpent;
      const roundedTimeSpent = roundToTwoDecimals(originalTimeSpent);
      
      if (originalTimeSpent !== roundedTimeSpent) {
        console.log(`  📅 ${date}: ${originalTimeSpent} → ${roundedTimeSpent}`);
        needsUpdate = true;
      }
      
      updatedDailyActivity[date] = {
        ...dayData,
        timeSpent: roundedTimeSpent
      };
    } else {
      updatedDailyActivity[date] = dayData;
    }
  }
  
  return needsUpdate ? updatedDailyActivity : null;
}

/**
 * Tüm kullanıcıların daily activity verilerini düzeltir
 * @param {boolean} dryRun - Gerçek güncelleme yapmadan önce kontrol
 */
async function fixDailyActivityDecimals(dryRun = false) {
  try {
    console.log('🔄 Firestore\'dan kullanıcıları çekiliyor...');
    
    const usersSnapshot = await db.collection('users').get();
    
    let updatedCount = 0;
    let totalUsers = 0;
    let processedCount = 0;
    const batchSize = 500;
    
    console.log(`📊 Toplam ${usersSnapshot.size} kullanıcı bulundu.`);
    
    // Kullanıcıları batch'ler halinde işle
    const userDocs = usersSnapshot.docs;
    
    for (let i = 0; i < userDocs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = userDocs.slice(i, i + batchSize);
      let batchUpdates = 0;
      
      for (const userDoc of batchDocs) {
        const userData = userDoc.data();
        totalUsers++;
        processedCount++;
        
        console.log(`\n👤 Kullanıcı işleniyor: ${userDoc.id} (${processedCount}/${userDocs.length})`);
        
        const updatedDailyActivity = fixUserDailyActivity(userData);
        
        if (updatedDailyActivity) {
          if (!dryRun) {
            batch.update(userDoc.ref, {
              'stats.dailyActivity': updatedDailyActivity
            });
            batchUpdates++;
          }
          updatedCount++;
          console.log(`✅ Kullanıcı ${userDoc.id} güncellendi`);
        } else {
          console.log(`⏭️ Değişiklik gerekmiyor`);
        }
      }
      
      if (!dryRun && batchUpdates > 0) {
        await batch.commit();
        console.log(`💾 Batch kaydedildi: ${batchUpdates} güncelleme`);
      }
      
      // Progress göster
      const progress = ((i + batchSize) / userDocs.length * 100).toFixed(1);
      console.log(`📈 İlerleme: %${Math.min(progress, 100)}`);
    }
    
    console.log(`\n🎉 İşlem tamamlandı!`);
    console.log(`📊 Toplam kullanıcı: ${totalUsers}`);
    console.log(`✅ Güncellenen kullanıcı: ${updatedCount}`);
    console.log(`⏭️ Değişiklik olmayan kullanıcı: ${totalUsers - updatedCount}`);
    
    if (dryRun) {
      console.log(`🔍 DRY RUN MODU - Gerçek güncelleme yapılmadı`);
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
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
      console.log('  node fix-daily-activity-decimals-admin.js [--dry-run]');
      console.log('');
      console.log('Seçenekler:');
      console.log('  --dry-run    Gerçek güncelleme yapmadan önce kontrol et');
      console.log('  --help, -h   Bu yardımı göster');
      return;
    }
    
    await fixDailyActivityDecimals(dryRun);
    
  } catch (error) {
    console.error('❌ Kritik hata:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Scripti çalıştır
if (require.main === module) {
  main();
} 