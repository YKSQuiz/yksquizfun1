# YKS Quiz - Bağlantı Test Script
# Bu script VPS bağlantısını ve deployment hazırlığını test eder

param(
    [switch]$FullTest = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "🔍 YKS Quiz Bağlantı Test Başlatılıyor..."

# Environment dosyasını kontrol et
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "❌ .env dosyası bulunamadı!"
    exit 1
}
Write-Success "✅ .env dosyası bulundu"

# Environment değişkenlerini yükle
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Gerekli değişkenleri kontrol et
Write-Info "🔧 Environment değişkenleri kontrol ediliyor..."

if (-not $VPS_HOST) {
    Write-Error "❌ VPS_HOST değişkeni eksik!"
    exit 1
}
Write-Success "✅ VPS_HOST: $VPS_HOST"

if (-not $VPS_USER) {
    Write-Error "❌ VPS_USER değişkeni eksik!"
    exit 1
}
Write-Success "✅ VPS_USER: $VPS_USER"

# Git durumunu kontrol et
Write-Info "📦 Git durumu kontrol ediliyor..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warning "⚠️  Commit edilmemiş değişiklikler var:"
    Write-Host $gitStatus -ForegroundColor Gray
} else {
    Write-Success "✅ Git working directory temiz"
}

# Git remote kontrolü
$gitRemote = git remote get-url origin
if ($gitRemote) {
    Write-Success "✅ Git remote: $gitRemote"
} else {
    Write-Warning "⚠️  Git remote bulunamadı"
}

# Node.js ve npm kontrolü
Write-Info "📦 Node.js ve npm kontrol ediliyor..."
$nodeVersion = node --version
$npmVersion = npm --version

if ($nodeVersion) {
    Write-Success "✅ Node.js: $nodeVersion"
} else {
    Write-Error "❌ Node.js bulunamadı!"
    exit 1
}

if ($npmVersion) {
    Write-Success "✅ npm: $npmVersion"
} else {
    Write-Error "❌ npm bulunamadı!"
    exit 1
}

# Package.json kontrolü
if (Test-Path "package.json") {
    Write-Success "✅ package.json bulundu"
} else {
    Write-Error "❌ package.json bulunamadı!"
    exit 1
}

# VPS bağlantısını test et
Write-Info "🌐 VPS bağlantısı test ediliyor..."
$testCommand = "ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} 'echo VPS bağlantısı başarılı'"
Invoke-Expression $testCommand

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ VPS bağlantısı başarısız!"
    Write-Info "💡 SSH key authentication kurulmuş mu kontrol edin:"
    Write-Info "   ssh-keygen -t rsa -b 4096 -C 'your_email@example.com'"
    Write-Info "   ssh-copy-id ${VPS_USER}@${VPS_HOST}"
    exit 1
}
Write-Success "✅ VPS bağlantısı başarılı"

# VPS'te hedef klasörü kontrol et
$remotePath = "/var/www/yksquiz"
Write-Info "📁 VPS'te hedef klasör kontrol ediliyor: $remotePath"

$checkPathCommand = "ssh ${VPS_USER}@${VPS_HOST} 'test -d $remotePath && echo Klasör mevcut || echo Klasör yok'"
$pathExists = Invoke-Expression $checkPathCommand

if ($pathExists -like "*Klasör mevcut*") {
    Write-Success "✅ Hedef klasör mevcut"
    
    # Klasör içeriğini kontrol et
    $listCommand = "ssh ${VPS_USER}@${VPS_HOST} 'ls -la $remotePath | head -5'"
    Write-Info "📋 Klasör içeriği:"
    Invoke-Expression $listCommand
} else {
    Write-Warning "⚠️  Hedef klasör yok, deployment sırasında oluşturulacak"
}

# Nginx durumunu kontrol et
Write-Info "🔄 Nginx durumu kontrol ediliyor..."
$nginxCommand = "ssh ${VPS_USER}@${VPS_HOST} 'systemctl is-active nginx'"
$nginxStatus = Invoke-Expression $nginxCommand

if ($nginxStatus -eq "active") {
    Write-Success "✅ Nginx aktif"
} else {
    Write-Warning "⚠️  Nginx aktif değil: $nginxStatus"
}

# Disk alanını kontrol et
Write-Info "💾 Disk alanı kontrol ediliyor..."
$diskCommand = "ssh ${VPS_USER}@${VPS_HOST} 'df -h /var/www'"
Invoke-Expression $diskCommand

# Build test (eğer full test isteniyorsa)
if ($FullTest) {
    Write-Info "🔨 Build test yapılıyor..."
    
    # Node modules kontrolü
    if (-not (Test-Path "node_modules")) {
        Write-Info "📦 Node modules yükleniyor..."
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "❌ npm install başarısız!"
            exit 1
        }
    }
    
    # Build test
    npm run build:prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Build test başarısız!"
        exit 1
    }
    Write-Success "✅ Build test başarılı"
    
    # Build klasörünü kontrol et
    $buildPath = Join-Path $PWD "build"
    if (Test-Path $buildPath) {
        $buildSize = (Get-ChildItem $buildPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Success "✅ Build klasörü oluşturuldu (${buildSize:F2} MB)"
    }
}

# Test tamamlandı
Write-Success "🎉 Bağlantı test başarıyla tamamlandı!"
Write-Info "🌐 VPS: ${VPS_USER}@${VPS_HOST}"
Write-Info "📁 Hedef: $remotePath"
Write-Info "⏰ Test Zamanı: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if (-not $FullTest) {
    Write-Info "💡 Tam test için -FullTest parametresini kullanın"
}
