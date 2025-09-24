const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Test suite'ini çalıştırır
 */
function runTests() {
  console.log('🧪 Test Suite Başlatılıyor...\n');

  // 1. Test dosyalarının kontrolü
  console.log('📁 Test Dosyaları Kontrolü:');
  const testFiles = findTestFiles();
  
  if (testFiles.length === 0) {
    console.log('  ⚠️ Test dosyası bulunamadı');
    console.log('  src/ klasöründe .test.js veya .spec.js dosyaları oluşturun');
  } else {
    console.log(`  ✅ ${testFiles.length} test dosyası bulundu`);
    testFiles.forEach(file => {
      console.log(`    - ${file}`);
    });
  }

  // 2. Jest konfigürasyonu kontrolü
  console.log('\n⚙️ Jest Konfigürasyonu:');
  const jestConfigFiles = ['jest.config.js', 'jest.config.json'];
  let jestConfigFound = false;
  
  jestConfigFiles.forEach(file => {
    const filePath = path.join(__dirname, '../../', file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file} mevcut`);
      jestConfigFound = true;
    }
  });

  if (!jestConfigFound) {
    console.log('  ⚠️ Jest konfigürasyon dosyası bulunamadı');
    console.log('  package.json içinde jest konfigürasyonu kullanılıyor olabilir');
  }

  // 3. Test çalıştırma
  console.log('\n🚀 Testleri Çalıştırıyor...');
  try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('\n✅ Tüm testler başarıyla geçti!');
  } catch (error) {
    console.log('\n❌ Bazı testler başarısız oldu');
    console.log('Test hatalarını düzeltip tekrar deneyin');
    process.exit(1);
  }
}

/**
 * Test dosyalarını bulur
 */
function findTestFiles() {
  const srcPath = path.join(__dirname, '../../src');
  const testFiles = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
        const relativePath = path.relative(srcPath, filePath);
        testFiles.push(relativePath);
      }
    });
  }

  scanDirectory(srcPath);
  return testFiles;
}

/**
 * Coverage raporu oluşturur
 */
function generateCoverageReport() {
  console.log('\n📊 Coverage Raporu Oluşturuluyor...');
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
    console.log('✅ Coverage raporu oluşturuldu');
  } catch (error) {
    console.log('❌ Coverage raporu oluşturulamadı');
  }
}

// Script'i çalıştır
if (require.main === module) {
  try {
    runTests();
    
    // Coverage raporu isteğe bağlı
    const args = process.argv.slice(2);
    if (args.includes('--coverage')) {
      generateCoverageReport();
    }
  } catch (error) {
    console.error('❌ Test çalıştırma sırasında hata:', error.message);
    process.exit(1);
  }
}

module.exports = { runTests, findTestFiles, generateCoverageReport }; 