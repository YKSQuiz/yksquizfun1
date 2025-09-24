# YKS Quiz Scripts

Bu klasör YKS Quiz uygulaması için gerekli tüm script'leri içerir.

## 📁 Klasör Yapısı

```
scripts/
├── database/          # Veritabanı işlemleri
├── deployment/        # Deployment script'leri
├── maintenance/       # Bakım ve temizlik
├── utils/            # Yardımcı araçlar
├── dev/              # Development araçları
├── test/             # Test script'leri
├── monitoring/       # Performans izleme
└── README.md         # Bu dosya
```

## 🚀 Hızlı Başlangıç

### Temel Komutlar

```bash
# Development ortamı kurulumu
npm run dev:setup

# Test çalıştırma
npm run test:run

# Bundle analizi
npm run utils:analyze-bundle

# Dependency kontrolü
npm run utils:check-deps

# Sitemap oluşturma
npm run utils:sitemap
```

### Deployment Komutları

```bash
# Hızlı deployment
npm run deploy:quick

# Tam deployment
npm run deploy:full

# Sistem sağlık kontrolü
npm run health:check
```

### Veritabanı Komutları

```bash
# CSV'den Firebase'e veri aktarımı
npm run db:upload-csv

# CSV doğrulama
npm run db:validate-csv

# Soru silme
npm run db:delete-questions

# Veri düzeltme işlemleri
npm run db:fix-daily-activity
npm run db:fix-session-time
npm run db:fix-session-times
```

## 📋 Script Kategorileri

### Database Scripts
Firebase veritabanı işlemleri için kullanılan script'ler.

**Dosyalar:**
- `csv-to-firebase.js` - CSV dosyalarından Firebase'e veri aktarımı
- `validate-csv.js` - CSV dosyalarının formatını doğrular
- `delete-questions.js` - Belirtilen soruları siler
- `fix-*.js` - Çeşitli veri düzeltme işlemleri

**Kullanım:**
```bash
cd scripts/database
node csv-to-firebase.js
```

### Deployment Scripts
Production ortamına deployment için kullanılan script'ler.

**Dosyalar:**
- `deploy.sh` - Tam deployment süreci
- `quick-deploy.sh` - Hızlı deployment
- `setup-vps.sh` - VPS kurulum script'i

**Kullanım:**
```bash
cd scripts/deployment
bash deploy.sh
```

### Maintenance Scripts
Sistem bakımı ve temizliği için kullanılan script'ler.

**Dosyalar:**
- `health-check.sh` - Sistem sağlık kontrolü
- `backup.sh` - Otomatik yedekleme
- `cleanup.sh` - Geçici dosya temizliği

**Kullanım:**
```bash
cd scripts/maintenance
bash health-check.sh
```

### Utility Scripts
Genel yardımcı araçlar.

**Dosyalar:**
- `generate-sitemap.js` - Sitemap.xml oluşturur
- `analyze-bundle.js` - Bundle boyutunu analiz eder
- `check-dependencies.js` - Dependency'leri kontrol eder

**Kullanım:**
```bash
cd scripts/utils
node generate-sitemap.js
```

### Development Scripts
Development ortamı için kullanılan script'ler.

**Dosyalar:**
- `setup-dev.js` - Development ortamı kurulumu

**Kullanım:**
```bash
cd scripts/dev
node setup-dev.js
```

### Test Scripts
Test süreçleri için kullanılan script'ler.

**Dosyalar:**
- `run-tests.js` - Test suite'ini çalıştırır

**Kullanım:**
```bash
cd scripts/test
node run-tests.js
```

### Monitoring Scripts
Performans izleme için kullanılan script'ler.

**Dosyalar:**
- `performance-monitor.js` - Performans metriklerini izler

**Kullanım:**
```bash
cd scripts/monitoring
node performance-monitor.js
```

## ⚠️ Güvenlik Notları

1. **Firebase Credentials**: `serviceAccountKey.json` dosyasını asla public repository'ye commit etmeyin
2. **Environment Variables**: Hassas bilgileri environment variable olarak saklayın
3. **Backup**: Düzenli olarak backup alın
4. **Permissions**: Script'leri çalıştırmadan önce gerekli izinleri kontrol edin

## 🔧 Troubleshooting

### Yaygın Sorunlar

**Script çalışmıyor:**
```bash
# Dosya izinlerini kontrol edin
chmod +x scripts/*/*.sh

# Node.js versiyonunu kontrol edin
node --version
```

**Firebase bağlantı hatası:**
```bash
# Service account key dosyasını kontrol edin
ls -la serviceAccountKey.json

# Firebase CLI'ı kontrol edin
firebase --version
```

**Permission hatası:**
```bash
# Sudo ile çalıştırın
sudo bash scripts/maintenance/health-check.sh
```

## 📞 Destek

Script'lerle ilgili sorunlar için:
1. İlgili klasördeki README dosyasını kontrol edin
2. Script'in hata mesajlarını inceleyin
3. Log dosyalarını kontrol edin

## 🔄 Güncellemeler

Script'leri güncellerken:
1. Önce test ortamında deneyin
2. Backup alın
3. Değişiklikleri dokümante edin
4. Team'e bilgi verin 