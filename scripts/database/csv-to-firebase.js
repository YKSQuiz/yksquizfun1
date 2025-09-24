const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Service account key dosyasını güvenli şekilde yükle
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
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
 * CSV içeriğini parse eder
 * @param {string} csvContent - CSV dosya içeriği
 * @returns {Array} Parse edilmiş sorular
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length < 1) {
    throw new Error('CSV dosyası boş veya geçersiz format');
  }
  
  const questions = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      
      if (values.length >= 9) {
        const question = {
          topicId: values[0]?.trim() || '',
          question: values[1]?.trim() || '',
          options: [
            values[2]?.trim() || '',
            values[3]?.trim() || '',
            values[4]?.trim() || '',
            values[5]?.trim() || ''
          ],
          correctAnswer: parseInt(values[6]) || 0,
          testNumber: parseInt(values[7]) || 1,
          explanation: values[8]?.trim() || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Veri doğrulama
        if (!question.topicId || !question.question) {
          errors.push(`Satır ${i + 1}: Eksik topicId veya question`);
          continue;
        }
        
        if (question.correctAnswer < 0 || question.correctAnswer > 3) {
          errors.push(`Satır ${i + 1}: Geçersiz correctAnswer (0-3 arası olmalı)`);
          continue;
        }
        
        questions.push(question);
      } else {
        errors.push(`Satır ${i + 1}: Yetersiz veri (${values.length}/9)`);
      }
    } catch (error) {
      errors.push(`Satır ${i + 1}: ${error.message}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn('⚠️ Parse hataları:', errors);
  }
  
  return questions;
}

/**
 * Tek bir CSV satırını parse eder
 * @param {string} line - CSV satırı
 * @returns {Array} Parse edilmiş değerler
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '$' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim()); // Son değeri ekle
  
  return values;
}

/**
 * Soruları Firebase'e yükler
 * @param {string} csvFilePath - CSV dosya yolu
 */
async function uploadCSV(csvFilePath) {
  try {
    console.log(`📁 CSV dosyası okunuyor: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const questions = parseCSV(csvContent);
    
    if (questions.length === 0) {
      console.error('❌ Yüklenecek soru bulunamadı!');
      return;
    }
    
    console.log(`📊 ${questions.length} soru bulundu. Firebase'e yükleniyor...`);
    
    // Batch işlemi için
    const batchSize = 500; // Firestore batch limiti
    let uploadedCount = 0;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = db.batch();
      const batchQuestions = questions.slice(i, i + batchSize);
      
      batchQuestions.forEach(question => {
        const docRef = db.collection('questions').doc();
        batch.set(docRef, question);
      });
      
      await batch.commit();
      uploadedCount += batchQuestions.length;
      
      console.log(`✅ ${uploadedCount}/${questions.length} soru yüklendi`);
    }
    
    console.log('🎉 Tüm sorular başarıyla Firebase\'e yüklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    throw error;
  }
}

// Ana fonksiyon
async function main() {
  try {
    const csvFilePath = process.argv[2];
    
    if (!csvFilePath) {
      console.error('❌ CSV dosya yolu belirtmelisiniz!');
      console.log('Kullanım: node csv-to-firebase.js dosyaadi.csv');
      process.exit(1);
    }
    
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ Dosya bulunamadı: ${csvFilePath}`);
      process.exit(1);
    }
    
    await uploadCSV(csvFilePath);
    
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