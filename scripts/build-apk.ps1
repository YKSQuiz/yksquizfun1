# YKS Quiz APK Build Script
Write-Host "YKS Quiz APK Build Baslatiliyor..." -ForegroundColor Green

# 1. Projeyi build et
Write-Host "React projesi build ediliyor..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build basarisiz!" -ForegroundColor Red
    exit 1
}

# 2. Capacitor web dosyalarini kopyala
Write-Host "Web dosyalari Android projesine kopyalaniyor..." -ForegroundColor Yellow
npx cap copy android

if ($LASTEXITCODE -ne 0) {
    Write-Host "Dosya kopyalama basarisiz!" -ForegroundColor Red
    exit 1
}

# 3. Capacitor sync
Write-Host "Capacitor sync yapiliyor..." -ForegroundColor Yellow
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "Sync basarisiz!" -ForegroundColor Red
    exit 1
}

# 4. APK build
Write-Host "APK build ediliyor..." -ForegroundColor Yellow
cd android
./gradlew assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host "APK build basarisiz!" -ForegroundColor Red
    cd ..
    exit 1
}

cd ..

# 5. APK dosyasini kopyala
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
$targetPath = "C:\Users\omer\Desktop\YKSQuiz-Debug.apk"

if (Test-Path $apkPath) {
    Copy-Item $apkPath $targetPath
    Write-Host "APK basariyla olusturuldu: $targetPath" -ForegroundColor Green
    $fileSize = (Get-Item $targetPath).Length / 1MB
    Write-Host "APK boyutu: $fileSize MB" -ForegroundColor Cyan
} else {
    Write-Host "APK dosyasi bulunamadi!" -ForegroundColor Red
    exit 1
}

Write-Host "APK build islemi tamamlandi!" -ForegroundColor Green