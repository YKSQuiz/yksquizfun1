# YKS Quiz - Rollback Script
# Bu script önceki versiyona geri dönmek için kullanılır

param(
    [string]$BackupPath = "",
    [switch]$ListBackups = $false,
    [switch]$Force = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "🔄 YKS Quiz Rollback Script Başlatılıyor..."

# Environment dosyasını kontrol et
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "❌ .env dosyası bulunamadı! Lütfen env.example dosyasını .env olarak kopyalayın."
    exit 1
}

# Environment değişkenlerini yükle
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Gerekli değişkenleri kontrol et
if (-not $VPS_HOST -or -not $VPS_USER) {
    Write-Error "❌ VPS_HOST veya VPS_USER değişkenleri eksik!"
    exit 1
}

$remotePath = "/var/www/yksquiz"

# Backup listesini göster
if ($ListBackups) {
    Write-Info "📋 Mevcut backup'lar listeleniyor..."
    $listCommand = "ssh ${VPS_USER}@${VPS_HOST} 'ls -la ${remotePath}_backup_* 2>/dev/null | sort -k6,7'"
    Invoke-Expression $listCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Info "ℹ️  Hiç backup bulunamadı."
    }
    exit 0
}

# VPS bağlantısını test et
Write-Info "🔍 VPS bağlantısı test ediliyor..."
$testCommand = "ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} 'echo VPS bağlantısı başarılı'"
Invoke-Expression $testCommand

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ VPS bağlantısı başarısız! Lütfen bağlantı ayarlarını kontrol edin."
    exit 1
}
Write-Success "✅ VPS bağlantısı başarılı"

# Backup path belirtilmemişse, en son backup'ı bul
if ([string]::IsNullOrEmpty($BackupPath)) {
    Write-Info "🔍 En son backup aranıyor..."
    $latestBackupCommand = "ssh ${VPS_USER}@${VPS_HOST} 'ls -t ${remotePath}_backup_* 2>/dev/null | head -1'"
    $BackupPath = Invoke-Expression $latestBackupCommand | Out-String
    
    if ([string]::IsNullOrWhiteSpace($BackupPath)) {
        Write-Error "❌ Hiç backup bulunamadı!"
        exit 1
    }
    
    $BackupPath = $BackupPath.Trim()
    Write-Info "📁 En son backup: $BackupPath"
}

# Backup'ın var olup olmadığını kontrol et
Write-Info "🔍 Backup kontrol ediliyor: $BackupPath"
$checkBackupCommand = "ssh ${VPS_USER}@${VPS_HOST} 'test -d $BackupPath && echo Backup mevcut'"
$backupExists = Invoke-Expression $checkBackupCommand

if (-not $backupExists) {
    Write-Error "❌ Belirtilen backup bulunamadı: $BackupPath"
    exit 1
}
Write-Success "✅ Backup bulundu: $BackupPath"

# Mevcut dosyaların backup'ını al
Write-Info "💾 Mevcut dosyaların backup'ı alınıyor..."
$currentBackupScript = "if [ -d $remotePath ] && [ `"`$(ls -A $remotePath)`" ]; then cp -r $remotePath ${remotePath}_current_backup_`$(date +%Y%m%d_%H%M%S); fi"
$currentBackupCommand = "ssh ${VPS_USER}@${VPS_HOST} '$currentBackupScript'"
Invoke-Expression $currentBackupCommand

# Rollback işlemi
Write-Info "🔄 Rollback işlemi başlatılıyor..."

if (-not $Force) {
    $response = Read-Host "Bu işlem mevcut dosyaları değiştirecek. Devam etmek istiyor musunuz? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Info "Rollback iptal edildi."
        exit 0
    }
}

# Mevcut dosyaları sil
Write-Info "🗑️  Mevcut dosyalar siliniyor..."
$removeCommand = "ssh ${VPS_USER}@${VPS_HOST} 'rm -rf $remotePath/*'"
Invoke-Expression $removeCommand

# Backup'tan dosyaları geri yükle
Write-Info "📥 Backup'tan dosyalar geri yükleniyor..."
$restoreCommand = "ssh ${VPS_USER}@${VPS_HOST} 'cp -r $BackupPath/* $remotePath/'"
Invoke-Expression $restoreCommand

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Rollback başarısız!"
    exit 1
}

# Dosya izinlerini ayarla
Write-Info "🔧 Dosya izinleri ayarlanıyor..."
$chmodCommand = "ssh ${VPS_USER}@${VPS_HOST} 'chmod -R 755 $remotePath'"
Invoke-Expression $chmodCommand

# Nginx'i yeniden yükle
Write-Info "🔄 Nginx yeniden yükleniyor..."
$nginxCommand = "ssh ${VPS_USER}@${VPS_HOST} 'systemctl reload nginx'"
Invoke-Expression $nginxCommand

if ($LASTEXITCODE -ne 0) {
    Write-Warning "⚠️  Nginx yeniden yükleme başarısız olabilir"
} else {
    Write-Success "✅ Nginx yeniden yüklendi"
}

# Rollback kontrolü
Write-Info "🔍 Rollback kontrol ediliyor..."
$checkCommand = "ssh ${VPS_USER}@${VPS_HOST} 'ls -la $remotePath | head -10'"
Invoke-Expression $checkCommand

# Rollback tamamlandı
Write-Success "🎉 Rollback başarıyla tamamlandı!"
Write-Info "🌐 Site: https://www.yksquiz.fun"
Write-Info "📁 Geri yüklenen backup: $BackupPath"
Write-Info "⏰ Rollback Zamanı: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Temizlik önerisi
Write-Info "💡 Öneri: Eski backup'ları temizlemek için 'ls -la /var/www/yksquiz_backup_*' komutunu çalıştırabilirsiniz."
