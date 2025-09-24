const fs = require('fs');
const path = require('path');

/**
 * Proje dependency'lerini kontrol eder
 */
function checkDependencies() {
  const packageJsonPath = path.join(__dirname, '../../package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json dosyası bulunamadı');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log('🔍 Dependency Kontrolü Başlıyor...\n');

  // Dependencies analizi
  console.log('📦 Production Dependencies:');
  const dependencies = packageJson.dependencies || {};
  Object.entries(dependencies).forEach(([name, version]) => {
    console.log(`  ${name}: ${version}`);
  });

  console.log('\n🛠️ Development Dependencies:');
  const devDependencies = packageJson.devDependencies || {};
  Object.entries(devDependencies).forEach(([name, version]) => {
    console.log(`  ${name}: ${version}`);
  });

  // Güvenlik kontrolü
  console.log('\n🔒 Güvenlik Kontrolü:');
  console.log('  npm audit çalıştırmanız önerilir: npm audit');
  console.log('  Güvenlik açıklarını düzeltmek için: npm audit fix');

  // Güncelleme önerileri
  console.log('\n🔄 Güncelleme Önerileri:');
  console.log('  Eski paketleri kontrol etmek için: npm outdated');
  console.log('  Güvenli güncellemeler için: npm update');
  console.log('  Major güncellemeler için: npm-check-updates');

  // Bundle analizi
  console.log('\n📊 Bundle Analizi:');
  console.log('  Bundle boyutunu analiz etmek için: npm run utils:analyze-bundle');
  console.log('  Webpack bundle analyzer için: npm run build:analyze');

  // Performans önerileri
  console.log('\n⚡ Performans Önerileri:');
  console.log('  • Kullanılmayan dependency\'leri kaldırın');
  console.log('  • Duplicate dependency\'leri kontrol edin');
  console.log('  • Tree shaking için ES modules kullanın');
  console.log('  • Code splitting uygulayın');
}

/**
 * Kullanılmayan dependency'leri tespit eder
 */
function findUnusedDependencies() {
  console.log('\n🔍 Kullanılmayan Dependency Analizi:');
  console.log('  Bu analiz için depcheck paketini kullanabilirsiniz:');
  console.log('  npm install -g depcheck');
  console.log('  depcheck');
}

// Script'i çalıştır
if (require.main === module) {
  try {
    checkDependencies();
    findUnusedDependencies();
  } catch (error) {
    console.error('❌ Dependency kontrolü sırasında hata:', error.message);
    process.exit(1);
  }
}

module.exports = { checkDependencies, findUnusedDependencies }; 