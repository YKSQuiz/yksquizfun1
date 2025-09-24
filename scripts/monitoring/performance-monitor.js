const fs = require('fs');
const path = require('path');

/**
 * Uygulama performansını izler
 */
function monitorPerformance() {
  console.log('📊 Performans İzleme Başlatılıyor...\n');

  // 1. Build boyutu analizi
  console.log('📦 Build Boyutu Analizi:');
  const buildPath = path.join(__dirname, '../../build');
  
  if (fs.existsSync(buildPath)) {
    const buildSize = calculateDirectorySize(buildPath);
    const buildSizeMB = (buildSize / (1024 * 1024)).toFixed(2);
    
    console.log(`  Toplam build boyutu: ${buildSizeMB} MB`);
    
    // Boyut kategorileri
    if (buildSizeMB < 2) {
      console.log('  ✅ Build boyutu optimal (2MB altında)');
    } else if (buildSizeMB < 5) {
      console.log('  ⚠️ Build boyutu büyük (2-5MB arası)');
    } else {
      console.log('  ❌ Build boyutu çok büyük (5MB üzeri)');
    }
  } else {
    console.log('  ⚠️ Build klasörü bulunamadı');
  }

  // 2. Bundle analizi
  console.log('\n📋 Bundle Analizi:');
  const staticPath = path.join(buildPath, 'static');
  
  if (fs.existsSync(staticPath)) {
    const jsPath = path.join(staticPath, 'js');
    const cssPath = path.join(staticPath, 'css');
    
    // JS dosyaları
    if (fs.existsSync(jsPath)) {
      const jsFiles = fs.readdirSync(jsPath).filter(file => file.endsWith('.js'));
      let totalJsSize = 0;
      
      jsFiles.forEach(file => {
        const filePath = path.join(jsPath, file);
        const stats = fs.statSync(filePath);
        totalJsSize += stats.size;
      });
      
      const totalJsSizeMB = (totalJsSize / (1024 * 1024)).toFixed(2);
      console.log(`  JavaScript toplam: ${totalJsSizeMB} MB (${jsFiles.length} dosya)`);
    }
    
    // CSS dosyaları
    if (fs.existsSync(cssPath)) {
      const cssFiles = fs.readdirSync(cssPath).filter(file => file.endsWith('.css'));
      let totalCssSize = 0;
      
      cssFiles.forEach(file => {
        const filePath = path.join(cssPath, file);
        const stats = fs.statSync(filePath);
        totalCssSize += stats.size;
      });
      
      const totalCssSizeKB = (totalCssSize / 1024).toFixed(2);
      console.log(`  CSS toplam: ${totalCssSizeKB} KB (${cssFiles.length} dosya)`);
    }
  }

  // 3. Kod kalitesi metrikleri
  console.log('\n🔍 Kod Kalitesi Metrikleri:');
  
  // TypeScript dosyaları sayısı
  const tsFiles = countFilesByExtension('src', '.ts');
  const tsxFiles = countFilesByExtension('src', '.tsx');
  console.log(`  TypeScript dosyaları: ${tsFiles + tsxFiles} (${tsFiles} .ts, ${tsxFiles} .tsx)`);
  
  // Component sayısı
  const componentFiles = countFilesByExtension('src/components', '.tsx');
  console.log(`  React bileşenleri: ${componentFiles}`);
  
  // Servis sayısı
  const serviceFiles = countFilesByExtension('src/services', '.ts');
  console.log(`  Servis dosyaları: ${serviceFiles}`);

  // 4. Performans önerileri
  console.log('\n💡 Performans Önerileri:');
  console.log('  • Bundle boyutunu azaltmak için code splitting kullanın');
  console.log('  • Lazy loading uygulayın');
  console.log('  • Gzip sıkıştırma etkinleştirin');
  console.log('  • CDN kullanmayı düşünün');
  console.log('  • Critical CSS inline edin');
  console.log('  • Image optimization yapın');
  console.log('  • Service Worker kullanın');

  // 5. Monitoring araçları
  console.log('\n🛠️ Önerilen Monitoring Araçları:');
  console.log('  • Lighthouse (Core Web Vitals)');
  console.log('  • WebPageTest');
  console.log('  • Google PageSpeed Insights');
  console.log('  • React DevTools Profiler');
  console.log('  • Bundle Analyzer');
}

/**
 * Klasör boyutunu hesaplar
 */
function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  
  if (fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  }
  
  return totalSize;
}

/**
 * Belirli uzantıdaki dosyaları sayar
 */
function countFilesByExtension(dirPath, extension) {
  const fullPath = path.join(__dirname, '../../', dirPath);
  let count = 0;
  
  if (!fs.existsSync(fullPath)) return 0;
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith(extension)) {
        count++;
      }
    });
  }
  
  scanDirectory(fullPath);
  return count;
}

// Script'i çalıştır
if (require.main === module) {
  try {
    monitorPerformance();
  } catch (error) {
    console.error('❌ Performans izleme sırasında hata:', error.message);
    process.exit(1);
  }
}

module.exports = { monitorPerformance }; 