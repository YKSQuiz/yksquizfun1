# YKS Quiz - Cleanup Script
# Bu script eski backup'ları ve geçici dosyaları temizlemek için kullanılır

param(
    [int]$KeepDays = 7,
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "🧹 YKS Quiz Cleanup Script Başlatılıyor..."
Write-Info "Keep Days: $KeepDays"
Write-Info "Dry Run: $DryRun"

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

# VPS bağlantısını test et
Write-Info "🔍 VPS bağlantısı test ediliyor..."
$testCommand = "ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} 'echo VPS bağlantısı başarılı'"
Invoke-Expression $testCommand

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ VPS bağlantısı başarısız! Lütfen bağlantı ayarlarını kontrol edin."
    exit 1
}
Write-Success "✅ VPS bağlantısı başarılı"

# Eski backup'ları listele
Write-Info "📋 Eski backup'lar listeleniyor..."
$listCommand = "ssh ${VPS_USER}@${VPS_HOST} 'find ${remotePath}_backup_* -type d -mtime +$KeepDays 2>/dev/null | sort'"
$oldBackups = Invoke-Expression $listCommand

if ([string]::IsNullOrWhiteSpace($oldBackups)) {
    Write-Info "ℹ️  Silinecek eski backup bulunamadı."
    exit 0
}

Write-Info "🗑️  Silinecek backup'lar:"
Write-Host $oldBackups -ForegroundColor Yellow

# Backup sayısını hesapla
$backupCount = ($oldBackups -split "`n").Count
Write-Info "📊 Toplam $backupCount backup silinecek"

if (-not $Force -and -not $DryRun) {
    $response = Read-Host "Bu backup'ları silmek istiyor musunuz? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Info "Cleanup iptal edildi."
        exit 0
    }
}

# Backup'ları sil
if (-not $DryRun) {
    Write-Info "🗑️  Eski backup'lar siliniyor..."
    
    foreach ($backup in $oldBackups -split "`n") {
        if (-not [string]::IsNullOrWhiteSpace($backup)) {
            $backup = $backup.Trim()
            Write-Info "Siliniyor: $backup"
            
            $removeCommand = "ssh ${VPS_USER}@${VPS_HOST} 'rm -rf $backup'"
            Invoke-Expression $removeCommand
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "✅ Silindi: $backup"
            } else {
                Write-Warning "⚠️  Silinemedi: $backup"
            }
        }
    }
} else {
    Write-Info "🔍 Dry run modu - hiçbir şey silinmedi"
}

# Disk kullanımını kontrol et
Write-Info "💾 Disk kullanımı kontrol ediliyor..."
$diskCommand = "ssh ${VPS_USER}@${VPS_HOST} 'df -h $remotePath'"
Invoke-Expression $diskCommand

# Kalan backup'ları listele
Write-Info "📋 Kalan backup'lar:"
$remainingCommand = "ssh ${VPS_USER}@${VPS_HOST} 'ls -la ${remotePath}_backup_* 2>/dev/null | sort -k6,7'"
Invoke-Expression $remainingCommand

# Cleanup tamamlandı
Write-Success "🎉 Cleanup başarıyla tamamlandı!"
Write-Info "⏰ Cleanup Zamanı: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if ($DryRun) {
    Write-Info "💡 Gerçek cleanup için -DryRun parametresini kaldırın."
}
