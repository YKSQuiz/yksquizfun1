# YKS Quiz - GitHub Deployment Script
# Bu script sadece GitHub'a push yapar

param(
    [string]$CommitMessage = "",
    [switch]$Force = $false
)

# Renkli output için fonksiyonlar
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script başlangıcı
Write-Info "📦 YKS Quiz GitHub Deployment Başlatılıyor..."

# Git durumunu kontrol et
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Info "📝 Değişiklikler tespit edildi:"
    Write-Host $gitStatus -ForegroundColor Gray
    
    if (-not $Force) {
        $response = Read-Host "Bu değişiklikleri commit etmek istiyor musunuz? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Info "GitHub deployment iptal edildi."
            exit 0
        }
    }
    
    # Değişiklikleri commit et
    Write-Info "📝 Değişiklikler commit ediliyor..."
    git add .
    
    if ([string]::IsNullOrEmpty($CommitMessage)) {
        $CommitMessage = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
    
    git commit -m $CommitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Git commit başarısız!"
        exit 1
    }
    Write-Success "✅ Değişiklikler commit edildi: $CommitMessage"
} else {
    Write-Info "ℹ️  Commit edilecek değişiklik bulunamadı."
}

# GitHub'a push et
Write-Info "🚀 GitHub'a push ediliyor..."
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ GitHub push başarısız!"
    exit 1
}

Write-Success "✅ GitHub'a başarıyla push edildi!"
Write-Info "🔗 Repository: https://github.com/your-username/yksquiz"
Write-Info "📊 Son commit: $(git log --oneline -1)"
