# YKS Quiz - Hızlı Deployment Script
# Bu script en basit deployment işlemini yapar

param(
    [switch]$Force = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "⚡ YKS Quiz Hızlı Deployment Başlatılıyor..."

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

# Git durumunu kontrol et
$gitStatus = git status --porcelain
if ($gitStatus -and -not $Force) {
    Write-Warning "⚠️  Commit edilmemiş değişiklikler var!"
    $response = Read-Host "Devam etmek istiyor musunuz? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Info "Deployment iptal edildi."
        exit 0
    }
}

# Değişiklikleri commit et
if ($gitStatus) {
    Write-Info "📝 Değişiklikler commit ediliyor..."
    git add .
    $commitMessage = "Quick Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Git commit başarısız!"
        exit 1
    }
    Write-Success "✅ Değişiklikler commit edildi"
}

# GitHub'a push et
Write-Info "🚀 GitHub'a push ediliyor..."
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ GitHub push başarısız!"
    exit 1
}
Write-Success "✅ GitHub'a başarıyla push edildi"

# Production build
Write-Info "🔨 Production build oluşturuluyor..."
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build başarısız!"
    exit 1
}
Write-Success "✅ Build başarılı"

# VPS'e dosyaları kopyala
Write-Info "📤 Dosyalar VPS'e kopyalanıyor..."
$buildPath = Join-Path $PWD "build"
$remotePath = "/var/www/yksquiz"

# SCP ile dosyaları kopyala
$scpCommand = "scp -r '$buildPath/*' ${VPS_USER}@${VPS_HOST}:$remotePath"
Invoke-Expression $scpCommand

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Dosya kopyalama başarısız!"
    exit 1
}
Write-Success "✅ Dosyalar VPS'e kopyalandı"

# Nginx'i yeniden yükle
Write-Info "🔄 Nginx yeniden yükleniyor..."
$nginxCommand = "ssh ${VPS_USER}@${VPS_HOST} 'systemctl reload nginx'"
Invoke-Expression $nginxCommand

if ($LASTEXITCODE -ne 0) {
    Write-Warning "⚠️  Nginx yeniden yükleme başarısız olabilir"
} else {
    Write-Success "✅ Nginx yeniden yüklendi"
}

# Deployment tamamlandı
Write-Success "🎉 Hızlı Deployment başarıyla tamamlandı!"
Write-Info "🌐 Site: https://www.yksquiz.fun"
Write-Info "⏰ Deployment Zamanı: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
