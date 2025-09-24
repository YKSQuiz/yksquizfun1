# YKS Quiz - VPS Deployment Script
# Bu script sadece VPS'e deployment yapar

param(
    [string]$Environment = "production",
    [switch]$SkipBuild = $false,
    [switch]$Force = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "🌐 YKS Quiz VPS Deployment Başlatılıyor..."
Write-Info "Environment: $Environment"

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

Write-Info "🔗 VPS Bağlantısı: ${VPS_USER}@${VPS_HOST}"

# Build işlemi (eğer atlanmamışsa)
if (-not $SkipBuild) {
    Write-Info "🔨 Production build oluşturuluyor..."
    
    # Node modules kontrolü
    if (-not (Test-Path "node_modules")) {
        Write-Info "📦 Node modules yükleniyor..."
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "❌ npm install başarısız!"
            exit 1
        }
    }
    
    # Production build
    npm run build:prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Build başarısız!"
        exit 1
    }
    Write-Success "✅ Build başarılı"
} else {
    Write-Info "⏭️  Build işlemi atlandı"
}

# Build klasörünü kontrol et
$buildPath = Join-Path $PWD "build"
if (-not (Test-Path $buildPath)) {
    Write-Error "❌ Build klasörü bulunamadı! Önce build işlemini çalıştırın."
    exit 1
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

# VPS'te hedef klasörü kontrol et ve oluştur
$remotePath = "/var/www/yksquiz"
Write-Info "📁 VPS'te hedef klasör kontrol ediliyor: $remotePath"

$mkdirCommand = "ssh ${VPS_USER}@${VPS_HOST} 'mkdir -p $remotePath'"
Invoke-Expression $mkdirCommand

# Backup oluştur (eğer mevcut dosyalar varsa)
Write-Info "💾 Mevcut dosyaların backup'ı alınıyor..."
$backupScript = "if [ -d $remotePath ] && [ `"`$(ls -A $remotePath)`" ]; then cp -r $remotePath ${remotePath}_backup_`$(date +%Y%m%d_%H%M%S); fi"
$backupCommand = "ssh ${VPS_USER}@${VPS_HOST} '$backupScript'"
Invoke-Expression $backupCommand

# Dosyaları VPS'e kopyala
Write-Info "📤 Dosyalar VPS'e kopyalanıyor..."
$scpCommand = "scp -r '$buildPath/*' ${VPS_USER}@${VPS_HOST}:$remotePath"

Write-Info "Komut: $scpCommand"
Invoke-Expression $scpCommand

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Dosya kopyalama başarısız!"
    exit 1
}
Write-Success "✅ Dosyalar VPS'e kopyalandı"

# VPS'te dosya izinlerini ayarla
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

# Deployment kontrolü
Write-Info "🔍 Deployment kontrol ediliyor..."
$checkCommand = "ssh ${VPS_USER}@${VPS_HOST} 'ls -la $remotePath | head -10'"
Invoke-Expression $checkCommand

# Build version bilgisini al
$versionFile = Join-Path $buildPath "version.txt"
if (Test-Path $versionFile) {
    $version = Get-Content $versionFile
    Write-Info "📊 Build Version: $version"
}

# Deployment tamamlandı
Write-Success "🎉 VPS Deployment başarıyla tamamlandı!"
Write-Info "🌐 Site: https://www.yksquiz.fun"
Write-Info "📁 VPS Path: $remotePath"
Write-Info "⏰ Deployment Zamanı: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Temizlik önerisi
Write-Info "💡 Öneri: Eski backup'ları temizlemek için VPS'te 'ls -la /var/www/yksquiz_backup_*' komutunu çalıştırabilirsiniz."
