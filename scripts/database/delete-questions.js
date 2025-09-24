const admin = require('firebase-admin');
const path = require('path');

// Service account key dosyasını güvenli şekilde yükle
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, 'serviceAccountKey.json');

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('❌ Service account key dosyası bulunamadı!');
  console.error('   FIREBASE_SERVICE_ACCOUNT_PATH environment variable ayarlayın');
  console.error('   veya serviceAccountKey.json dosyasını scripts/database/ klasörüne koyun');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Firebase Admin SDK'yı başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Belirtilen topicId'ye sahip soruları siler
 * @param {string} topicId - Silinecek soruların topicId'si
 * @param {boolean} dryRun - Gerçek silme işlemi yapmadan önce kontrol
 */
async function deleteQuestions(topicId = 'sozcukte-anlam', dryRun = false) {
  try {
    console.log(`🔍 "${topicId}" topicId'li soruları arıyorum...`);
    
    const questionsRef = db.collection('questions');
    const snapshot = await questionsRef.where('topicId', '==', topicId).get();
    
    if (snapshot.empty) {
      console.log('❌ Silinecek soru bulunamadı.');
      return;
    }
    
    console.log(`📊 ${snapshot.size} soru bulundu.`);
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODU - Gerçek silme işlemi yapılmayacak:');
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ${data.question?.substring(0, 60)}...`);
      });
      return;
    }
    
    console.log('🗑️ Sorular siliniyor...');
    
    // Batch delete için (500 limit)
    const batchSize = 500;
    const docs = snapshot.docs;
    let deletedCount = 0;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((doc) => {
        const data = doc.data();
        console.log(`🗑️ Siliniyor: ${data.question?.substring(0, 50)}...`);
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`✅ ${deletedCount}/${docs.length} soru silindi`);
    }
    
    console.log('🎉 Tüm sorular başarıyla silindi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    throw error;
  }
}

/**
 * Tüm soruları listeler (sadece bilgi amaçlı)
 */
async function listAllQuestions() {
  try {
    console.log('📋 Tüm sorular listeleniyor...');
    
    const questionsRef = db.collection('questions');
    const snapshot = await questionsRef.limit(100).get(); // İlk 100 soru
    
    if (snapshot.empty) {
      console.log('❌ Hiç soru bulunamadı.');
      return;
    }
    
    console.log(`📊 İlk ${snapshot.size} soru:`);
    
    const topicCounts = {};
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const topicId = data.topicId || 'Bilinmeyen';
      topicCounts[topicId] = (topicCounts[topicId] || 0) + 1;
    });
    
    Object.entries(topicCounts).forEach(([topicId, count]) => {
      console.log(`  📚 ${topicId}: ${count} soru`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

// Ana fonksiyon
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'delete':
        const topicId = args[1] || 'sozcukte-anlam';
        const dryRun = args.includes('--dry-run');
        await deleteQuestions(topicId, dryRun);
        break;
        
      case 'list':
        await listAllQuestions();
        break;
        
      case 'help':
      default:
        console.log('📖 Kullanım:');
        console.log('  node delete-questions.js delete [topicId] [--dry-run]  - Soruları sil');
        console.log('  node delete-questions.js list                        - Soruları listele');
        console.log('  node delete-questions.js help                         - Bu yardımı göster');
        console.log('');
        console.log('Örnekler:');
        console.log('  node delete-questions.js delete sozcukte-anlam');
        console.log('  node delete-questions.js delete sozcukte-anlam --dry-run');
        console.log('  node delete-questions.js list');
        break;
    }
    
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