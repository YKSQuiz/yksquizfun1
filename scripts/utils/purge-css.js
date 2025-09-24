#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * CSS Purging Utility
 * Kullanılmayan CSS sınıflarını tespit eder ve temizler
 */

function purgeCSS() {
  console.log('🧹 CSS Purging başlatılıyor...\n');

  // 1. Kullanılan CSS sınıflarını tespit et
  console.log('📋 Kullanılan CSS sınıfları tespit ediliyor...');
  
  const srcPath = path.join(__dirname, '../../src');
  const usedClasses = new Set();
  
  // TypeScript/JavaScript dosyalarından CSS sınıflarını çıkar
  function extractClassesFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // className="..." pattern'larını bul
      const classNameMatches = content.match(/className\s*=\s*["'`]([^"'`]+)["'`]/g);
      if (classNameMatches) {
        classNameMatches.forEach(match => {
          const classes = match.match(/["'`]([^"'`]+)["'`]/)[1];
          classes.split(/\s+/).forEach(cls => {
            if (cls.trim()) usedClasses.add(cls.trim());
          });
        });
      }
      
      // Template literal'lardaki sınıfları bul
      const templateMatches = content.match(/className\s*=\s*\{[^}]*\}/g);
      if (templateMatches) {
        templateMatches.forEach(match => {
          // Basit string interpolation'ları bul
          const stringMatches = match.match(/["'`]([^"'`]+)["'`]/g);
          if (stringMatches) {
            stringMatches.forEach(str => {
              const classes = str.replace(/["'`]/g, '');
              classes.split(/\s+/).forEach(cls => {
                if (cls.trim()) usedClasses.add(cls.trim());
              });
            });
          }
        });
      }
    } catch (error) {
      console.warn(`Dosya okunamadı: ${filePath}`, error.message);
    }
  }
  
  // Tüm dosyaları tara
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
        extractClassesFromFile(filePath);
      }
    });
  }
  
  scanDirectory(srcPath);
  
  console.log(`✅ ${usedClasses.size} adet kullanılan CSS sınıfı tespit edildi`);
  
  // 2. CSS dosyalarındaki tüm sınıfları tespit et
  console.log('\n📝 CSS dosyalarındaki sınıflar analiz ediliyor...');
  
  const cssPath = path.join(__dirname, '../../src/styles');
  const allCSSClasses = new Set();
  
  function extractCSSClasses(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // CSS sınıflarını bul (.class-name pattern)
      const classMatches = content.match(/\.[a-zA-Z0-9_-]+/g);
      if (classMatches) {
        classMatches.forEach(match => {
          const className = match.substring(1); // . karakterini kaldır
          allCSSClasses.add(className);
        });
      }
    } catch (error) {
      console.warn(`CSS dosyası okunamadı: ${filePath}`, error.message);
    }
  }
  
  function scanCSSDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanCSSDirectory(filePath);
      } else if (file.endsWith('.css')) {
        extractCSSClasses(filePath);
      }
    });
  }
  
  scanCSSDirectory(cssPath);
  
  console.log(`✅ ${allCSSClasses.size} adet CSS sınıfı tespit edildi`);
  
  // 3. Kullanılmayan sınıfları tespit et
  console.log('\n🔍 Kullanılmayan CSS sınıfları tespit ediliyor...');
  
  const unusedClasses = new Set();
  allCSSClasses.forEach(className => {
    if (!usedClasses.has(className)) {
      // Bazı özel sınıfları hariç tut
      if (!isSpecialClass(className)) {
        unusedClasses.add(className);
      }
    }
  });
  
  console.log(`⚠️ ${unusedClasses.size} adet kullanılmayan CSS sınıfı tespit edildi`);
  
  // 4. Rapor oluştur
  console.log('\n📊 CSS Purging Raporu:');
  console.log(`  📈 Toplam CSS sınıfı: ${allCSSClasses.size}`);
  console.log(`  ✅ Kullanılan sınıf: ${usedClasses.size}`);
  console.log(`  ❌ Kullanılmayan sınıf: ${unusedClasses.size}`);
  console.log(`  📉 Temizlenebilir oran: ${((unusedClasses.size / allCSSClasses.size) * 100).toFixed(1)}%`);
  
  // 5. Kullanılmayan sınıfları listele (ilk 20)
  if (unusedClasses.size > 0) {
    console.log('\n🗑️ Kullanılmayan sınıflar (ilk 20):');
    const unusedArray = Array.from(unusedClasses).slice(0, 20);
    unusedArray.forEach(className => {
      console.log(`  • .${className}`);
    });
    
    if (unusedClasses.size > 20) {
      console.log(`  ... ve ${unusedClasses.size - 20} tane daha`);
    }
  }
  
  // 6. Öneriler
  console.log('\n💡 Öneriler:');
  if (unusedClasses.size > 50) {
    console.log('  🚨 Çok fazla kullanılmayan CSS sınıfı var!');
    console.log('  📝 PostCSS PurgeCSS kullanarak otomatik temizlik yapın');
  } else if (unusedClasses.size > 20) {
    console.log('  ⚠️ Orta seviyede kullanılmayan CSS sınıfı var');
    console.log('  🔧 Manuel temizlik veya PurgeCSS kullanabilirsiniz');
  } else {
    console.log('  ✅ CSS sınıfları oldukça temiz');
  }
  
  console.log('\n🎯 Sonraki adımlar:');
  console.log('  1. npm run build:prod (PostCSS PurgeCSS otomatik çalışacak)');
  console.log('  2. Bundle analizi: npm run utils:analyze-bundle');
  console.log('  3. Performans testi: npm run test:mobile-performance');
}

function isSpecialClass(className) {
  // Özel sınıfları koru (pseudo-classes, media queries, etc.)
  const specialPatterns = [
    /^hover:/,
    /^focus:/,
    /^active:/,
    /^before:/,
    /^after:/,
    /^first:/,
    /^last:/,
    /^nth-/,
    /^sm:/,
    /^md:/,
    /^lg:/,
    /^xl:/,
    /^2xl:/,
    /^dark:/,
    /^light:/,
    /^print:/,
    /^screen:/,
    /^motion-/,
    /^reduce-/,
    /^contrast-/,
    /^forced-colors/,
    /^portrait/,
    /^landscape/,
    /^any-/,
    /^all:/,
    /^only:/,
    /^not:/,
    /^is-/,
    /^has-/,
    /^where:/,
    /^supports/,
    /^media/,
    /^keyframes/,
    /^from$/,
    /^to$/,
    /^root$/,
    /^html$/,
    /^body$/,
    /^\*$/
  ];
  
  return specialPatterns.some(pattern => pattern.test(className));
}

// Script'i çalıştır
if (require.main === module) {
  try {
    purgeCSS();
  } catch (error) {
    console.error('❌ CSS purging sırasında hata:', error.message);
    process.exit(1);
  }
}

module.exports = { purgeCSS };
