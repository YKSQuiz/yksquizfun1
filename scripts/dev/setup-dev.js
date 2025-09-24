const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Development ortamı kurulum script'i
 */
function setupDev() {
  console.log('🚀 Development Ortamı Kurulumu Başlıyor...\n');

  // 1. Node.js versiyon kontrolü
  console.log('📋 Node.js Versiyon Kontrolü:');
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(`  ✅ Node.js: ${nodeVersion}`);
    
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`  ✅ npm: ${npmVersion}`);
  } catch (error) {
    console.error('  ❌ Node.js veya npm bulunamadı');
    process.exit(1);
  }

  // 2. Gerekli dosyaların kontrolü
  console.log('\n📁 Gerekli Dosya Kontrolü:');
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'src/App.tsx',
    'public/index.html'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '../../', file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} bulunamadı`);
    }
  });

  // 3. Environment dosyaları kontrolü
  console.log('\n🔧 Environment Kontrolü:');
  const envFiles = ['.env', '.env.local', '.env.development'];
  envFiles.forEach(file => {
    const filePath = path.join(__dirname, '../../', file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file} mevcut`);
    } else {
      console.log(`  ⚠️ ${file} bulunamadı (opsiyonel)`);
    }
  });

  // 4. Firebase konfigürasyonu kontrolü
  console.log('\n🔥 Firebase Konfigürasyonu:');
  const firebaseConfigPath = path.join(__dirname, '../../src/services/firebase/config.ts');
  if (fs.existsSync(firebaseConfigPath)) {
    console.log('  ✅ Firebase config dosyası mevcut');
  } else {
    console.log('  ⚠️ Firebase config dosyası bulunamadı');
  }

  // 5. Kurulum önerileri
  console.log('\n💡 Kurulum Adımları:');
  console.log('  1. npm install (dependency\'leri yükle)');
  console.log('  2. npm start (development server\'ı başlat)');
  console.log('  3. npm run type-check (TypeScript kontrolü)');
  console.log('  4. npm run lint (kod kalitesi kontrolü)');

  // 6. Development araçları
  console.log('\n🛠️ Önerilen Development Araçları:');
  console.log('  • VS Code');
  console.log('  • React Developer Tools');
  console.log('  • Redux DevTools (eğer Redux kullanılıyorsa)');
  console.log('  • ESLint ve Prettier eklentileri');

  console.log('\n✅ Development ortamı kurulumu tamamlandı!');
}

// Script'i çalıştır
if (require.main === module) {
  try {
    setupDev();
  } catch (error) {
    console.error('❌ Development kurulumu sırasında hata:', error.message);
    process.exit(1);
  }
}

module.exports = { setupDev }; 