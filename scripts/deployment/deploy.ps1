# YKS Quiz - Ana Deployment Script
# Bu script hem GitHub'a push hem de VPS'e deployment yapar

param(
    [string]$Environment = "production",
    [switch]$SkipGit = $false,
    [switch]$SkipVPS = $false,
    [switch]$Force = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "🚀 YKS Quiz Deployment Başlatılıyor..."
Write-Info "Environment: $Environment"
Write-Info "Skip Git: $SkipGit"
Write-Info "Skip VPS: $SkipVPS"

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

# Git işlemleri (eğer atlanmamışsa)
if (-not $SkipGit) {
    Write-Info "📦 Git işlemleri başlatılıyor..."
    
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
        $commitMessage = "Deploy: $Environment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
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
}

# VPS Deployment (eğer atlanmamışsa)
if (-not $SkipVPS) {
    Write-Info "🌐 VPS Deployment başlatılıyor..."
    
    # Build işlemi
    Write-Info "🔨 Production build oluşturuluyor..."
    npm run build:prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Build başarısız!"
        exit 1
    }
    Write-Success "✅ Build başarılı"
    
    # VPS'e dosyaları kopyala
    Write-Info "📤 Dosyalar VPS'e kopyalanıyor..."
    
    # SSH ile dosyaları kopyala
    $buildPath = Join-Path $PWD "build"
    $remotePath = "/var/www/yksquiz"
    
    # SCP ile dosyaları kopyala
    $scpCommand = "scp -r '$buildPath/*' ${VPS_USER}@${VPS_HOST}:$remotePath"
    Write-Info "Komut: $scpCommand"
    
    Invoke-Expression $scpCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Dosya kopyalama başarısız!"
        exit 1
    }
    Write-Success "✅ Dosyalar VPS'e kopyalandı"
    
    # VPS'te ek işlemler
    Write-Info "🔧 VPS'te ek işlemler yapılıyor..."
    $sshCommand = "ssh ${VPS_USER}@${VPS_HOST} 'cd $remotePath && chmod -R 755 . && systemctl reload nginx'"
    
    Invoke-Expression $sshCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "⚠️  VPS'te ek işlemler başarısız olabilir, ancak deployment tamamlandı"
    } else {
        Write-Success "✅ VPS işlemleri tamamlandı"
    }
}

# Deployment tamamlandı
Write-Success "🎉 Deployment başarıyla tamamlandı!"
Write-Info "🌐 Site: https://www.yksquiz.fun"
Write-Info "📊 Build Version: $(Get-Content 'build/version.txt' -ErrorAction SilentlyContinue)"

# Temizlik
Write-Info "🧹 Geçici dosyalar temizleniyor..."
if (Test-Path "build") {
    # Build klasörünü temizle (isteğe bağlı)
    # Remove-Item "build" -Recurse -Force
}

Write-Success "✨ Tüm işlemler tamamlandı!"
