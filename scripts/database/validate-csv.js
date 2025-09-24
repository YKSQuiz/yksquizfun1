const fs = require('fs');
const path = require('path');

/**
 * CSV dosyasını validate eder
 * @param {string} csvFilePath - CSV dosya yolu
 */
function validateCSV(csvFilePath) {
  try {
    console.log(`🔍 CSV dosyası validate ediliyor: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Dosya bulunamadı: ${csvFilePath}`);
    }
    
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('CSV dosyası boş veya geçersiz format');
    }
    
    const headers = lines[0].split('$');
    const expectedHeaders = ['topicId', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'testNumber', 'explanation'];
    
    console.log(`📊 Toplam satır: ${lines.length - 1}`);
    console.log(`📋 Başlıklar: ${headers.join(', ')}`);
    
    // Başlık kontrolü
    if (headers.length !== expectedHeaders.length) {
      throw new Error(`Beklenen ${expectedHeaders.length} başlık, bulunan ${headers.length}`);
    }
    
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (headers[i] !== expectedHeaders[i]) {
        throw new Error(`Beklenen başlık: ${expectedHeaders[i]}, bulunan: ${headers[i]}`);
      }
    }
    
    console.log('✅ Başlıklar doğru');
    
    // Veri satırlarını kontrol et
    const errors = [];
    const warnings = [];
    const topicCounts = {};
    
    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== expectedHeaders.length) {
        errors.push(`Satır ${lineNumber}: Yetersiz veri (${values.length}/${expectedHeaders.length})`);
        continue;
      }
      
      const [topicId, question, optionA, optionB, optionC, optionD, correctAnswer, testNumber, explanation] = values;
      
      // Veri doğrulama
      if (!topicId?.trim()) {
        errors.push(`Satır ${lineNumber}: Eksik topicId`);
      }
      
      if (!question?.trim()) {
        errors.push(`Satır ${lineNumber}: Eksik question`);
      }
      
      if (!optionA?.trim() || !optionB?.trim() || !optionC?.trim() || !optionD?.trim()) {
        errors.push(`Satır ${lineNumber}: Eksik seçenek`);
      }
      
      const correctAnswerNum = parseInt(correctAnswer);
      if (isNaN(correctAnswerNum) || correctAnswerNum < 0 || correctAnswerNum > 3) {
        errors.push(`Satır ${lineNumber}: Geçersiz correctAnswer (${correctAnswer})`);
      }
      
      const testNumberNum = parseInt(testNumber);
      if (isNaN(testNumberNum) || testNumberNum < 1) {
        warnings.push(`Satır ${lineNumber}: Geçersiz testNumber (${testNumber})`);
      }
      
      if (!explanation?.trim()) {
        warnings.push(`Satır ${lineNumber}: Eksik explanation`);
      }
      
      // Topic sayımı
      if (topicId?.trim()) {
        topicCounts[topicId] = (topicCounts[topicId] || 0) + 1;
      }
    }
    
    // Sonuçları göster
    console.log('\n📊 Validation Sonuçları:');
    console.log(`✅ Toplam soru: ${lines.length - 1}`);
    console.log(`❌ Hatalar: ${errors.length}`);
    console.log(`⚠️ Uyarılar: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Hatalar:');
      errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ Uyarılar:');
      warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    console.log('\n📚 Topic Dağılımı:');
    Object.entries(topicCounts).forEach(([topicId, count]) => {
      console.log(`  📖 ${topicId}: ${count} soru`);
    });
    
    if (errors.length === 0) {
      console.log('\n🎉 CSV dosyası geçerli!');
      return true;
    } else {
      console.log('\n❌ CSV dosyasında hatalar var!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation hatası:', error.message);
    return false;
  }
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

// Ana fonksiyon
function main() {
  try {
    const csvFilePath = process.argv[2];
    
    if (!csvFilePath) {
      console.error('❌ CSV dosya yolu belirtmelisiniz!');
      console.log('Kullanım: node validate-csv.js dosyaadi.csv');
      process.exit(1);
    }
    
    const isValid = validateCSV(csvFilePath);
    process.exit(isValid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Kritik hata:', error.message);
    process.exit(1);
  }
}

// Script'i çalıştır
if (require.main === module) {
  main();
} 