# YKS Quiz - Full Deployment Script
param(
    [string]$Environment = "production",
    [string]$CommitMessage = "",
    [switch]$Force = $false,
    [switch]$SkipTests = $false
)

# Colored output functions
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Script start
Write-Info "YKS Quiz Full Deployment Starting..."

# Check environment file
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found!"
    exit 1
}

# Load environment variables
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Check required variables
if (-not $VPS_HOST -or -not $VPS_USER) {
    Write-Error "VPS_HOST or VPS_USER variables missing!"
    exit 1
}

# Check Git status
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Info "Changes detected"
    if (-not $Force) {
        $response = Read-Host "Do you want to commit these changes? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Info "Deployment cancelled."
            exit 0
        }
    }
    
    # Commit changes
    Write-Info "Committing changes..."
    git add .
    if ([string]::IsNullOrEmpty($CommitMessage)) {
        $CommitMessage = "Deploy: $Environment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
    git commit -m $CommitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Git commit failed!"
        exit 1
    }
    Write-Success "Changes committed"
} else {
    Write-Info "No changes to commit"
}

# Push to GitHub
Write-Info "Pushing to GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub push failed!"
    exit 1
}
Write-Success "Successfully pushed to GitHub"

# Production build
Write-Info "Creating production build..."
npm run build:prod
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}
Write-Success "Build successful"

# Test VPS connection
Write-Info "Testing VPS connection..."
$testCommand = "ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} 'echo VPS connection successful'"
Invoke-Expression $testCommand
if ($LASTEXITCODE -ne 0) {
    Write-Error "VPS connection failed!"
    exit 1
}
Write-Success "VPS connection successful"

# Create target directory on VPS
$remotePath = "/var/www/yksquiz"
Write-Info "Creating target directory on VPS..."
$mkdirCommand = "ssh ${VPS_USER}@${VPS_HOST} 'mkdir -p $remotePath'"
Invoke-Expression $mkdirCommand

# Copy files to VPS
Write-Info "Copying files to VPS..."
$buildPath = Join-Path $PWD "build"
$scpCommand = "scp -r '$buildPath/*' ${VPS_USER}@${VPS_HOST}:$remotePath"
Invoke-Expression $scpCommand
if ($LASTEXITCODE -ne 0) {
    Write-Error "File copy failed!"
    exit 1
}
Write-Success "Files copied to VPS"

# Reload Nginx
Write-Info "Reloading Nginx..."
$nginxCommand = "ssh ${VPS_USER}@${VPS_HOST} 'systemctl reload nginx'"
Invoke-Expression $nginxCommand
if ($LASTEXITCODE -eq 0) {
    Write-Success "Nginx reloaded"
} else {
    Write-Warning "Nginx reload may have failed"
}

# Deployment completed
Write-Success "Full Deployment completed successfully!"
Write-Info "Site: https://www.yksquiz.fun"
Write-Info "Deployment Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
