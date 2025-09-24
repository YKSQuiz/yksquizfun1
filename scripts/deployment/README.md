# YKS Quiz Deployment Scripts

Bu klasör, YKS Quiz uygulamasını GitHub ve VPS sunucusuna deploy etmek için kullanılan PowerShell script'lerini içerir.

## 📋 Gereksinimler

- PowerShell 5.1 veya üzeri
- Git
- Node.js ve npm
- SSH erişimi (VPS için)
- SCP (dosya kopyalama için)

## 🔧 Kurulum

1. **Environment dosyasını oluşturun:**
   ```powershell
   Copy-Item env.example .env
   ```

2. **`.env` dosyasını düzenleyin:**
   ```env
   # VPS Connection Settings
   VPS_HOST=your_vps_host_here
   VPS_USER=your_username_here
   VPS_PASS=your_vps_password_here
   VPS_EMAIL=your_email@example.com

   # Git Settings (optional)
   GIT_REPO=origin
   GIT_BRANCH=main
   ```

3. **SSH key authentication kurun (önerilen):**
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ssh-copy-id your_username@your_vps_host
   ```

## 🚀 Kullanım

### Ana Deployment Script'leri

#### 1. Tam Deployment (GitHub + VPS)
```powershell
# Tüm işlemleri yapar (Git commit, push, build, VPS deployment)
npm run deploy:full

# Veya direkt script'i çalıştırın
.\scripts\deployment\full-deploy.ps1

# Parametrelerle
.\scripts\deployment\full-deploy.ps1 -Environment "production" -CommitMessage "Yeni özellik eklendi" -Force
```

#### 2. Sadece GitHub Deployment
```powershell
# Sadece GitHub'a push yapar
npm run deploy:github

# Veya direkt script'i çalıştırın
.\scripts\deployment\github-deploy.ps1 -CommitMessage "Güncelleme"
```

#### 3. Sadece VPS Deployment
```powershell
# Sadece VPS'e deployment yapar
npm run deploy:vps

# Veya direkt script'i çalıştırın
.\scripts\deployment\vps-deploy.ps1 -SkipBuild
```

### Yardımcı Script'ler

#### 4. Rollback (Geri Alma)
```powershell
# En son backup'a geri dön
.\scripts\deployment\rollback.ps1

# Belirli bir backup'a geri dön
.\scripts\deployment\rollback.ps1 -BackupPath "/var/www/yksquiz_backup_20241201_143022"

# Mevcut backup'ları listele
.\scripts\deployment\rollback.ps1 -ListBackups
```

#### 5. Cleanup (Temizlik)
```powershell
# 7 günden eski backup'ları sil
.\scripts\deployment\cleanup.ps1

# Dry run (sadece göster, silme)
.\scripts\deployment\cleanup.ps1 -DryRun

# 30 günden eski backup'ları sil
.\scripts\deployment\cleanup.ps1 -KeepDays 30 -Force
```

## 📝 Script Parametreleri

### Genel Parametreler
- `-Environment`: Deployment ortamı (production, staging)
- `-Force`: Onay sormadan işlem yap
- `-CommitMessage`: Git commit mesajı

### Deployment Parametreleri
- `-SkipGit`: Git işlemlerini atla
- `-SkipVPS`: VPS deployment'ını atla
- `-SkipBuild`: Build işlemini atla
- `-SkipTests`: Test'leri atla

### Rollback Parametreleri
- `-BackupPath`: Geri yüklenecek backup yolu
- `-ListBackups`: Mevcut backup'ları listele

### Cleanup Parametreleri
- `-KeepDays`: Kaç günlük backup'ları tut (varsayılan: 7)
- `-DryRun`: Sadece göster, silme

## 🔍 Monitoring ve Kontrol

### Deployment Durumu Kontrolü
```powershell
# VPS'te dosyaları kontrol et
ssh your_username@your_vps_host "ls -la /var/www/yksquiz"

# Nginx durumunu kontrol et
ssh your_username@your_vps_host "systemctl status nginx"

# Disk kullanımını kontrol et
ssh your_username@your_vps_host "df -h /var/www"
```

### Log Kontrolü
```powershell
# Nginx error log'ları
ssh your_username@your_vps_host "tail -f /var/log/nginx/error.log"

# Nginx access log'ları
ssh your_username@your_vps_host "tail -f /var/log/nginx/access.log"
```

## 🛠️ Sorun Giderme

### Yaygın Hatalar

1. **SSH Bağlantı Hatası:**
   ```powershell
   # SSH key'i test et
   ssh -T your_username@your_vps_host
   
   # SSH config'i kontrol et
   ssh -v your_username@your_vps_host
   ```

2. **Build Hatası:**
   ```powershell
   # Node modules'ü temizle ve yeniden yükle
   Remove-Item node_modules -Recurse -Force
   npm install
   npm run build:prod
   ```

3. **Permission Hatası:**
   ```powershell
   # VPS'te dosya izinlerini düzelt
   ssh your_username@your_vps_host "chmod -R 755 /var/www/yksquiz"
   ```

### Debug Modu
```powershell
# Verbose output ile çalıştır
$VerbosePreference = "Continue"
.\scripts\deployment\full-deploy.ps1 -Verbose
```

## 📊 Backup Sistemi

- Her deployment öncesi otomatik backup alınır
- Backup'lar `/var/www/yksquiz_backup_YYYYMMDD_HHMMSS` formatında saklanır
- Rollback ile önceki versiyonlara dönülebilir
- Cleanup script ile eski backup'lar temizlenebilir

## 🔒 Güvenlik

- SSH key authentication kullanın
- `.env` dosyasını git'e commit etmeyin
- VPS şifrelerini güvenli şekilde saklayın
- Düzenli olarak backup'ları kontrol edin

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Script log'larını kontrol edin
2. VPS bağlantısını test edin
3. Disk alanını kontrol edin
4. Nginx durumunu kontrol edin

## 🚀 Otomatik Deployment

GitHub Actions ile otomatik deployment için `.github/workflows/deploy.yml` dosyası oluşturabilirsiniz.
