#!/bin/bash

# Cleanup Script
# Bu script geçici dosyaları ve gereksiz dosyaları temizler

echo "🧹 Temizlik işlemi başlatılıyor..."

# Renkli output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Konfigürasyon
PROJECT_DIR="/var/www/yksquiz.fun"
LOG_DIR="/var/log"
TEMP_DIR="/tmp"

echo "📁 Temizlik yapılacak klasörler:"
echo "- Proje: $PROJECT_DIR"
echo "- Loglar: $LOG_DIR"
echo "- Geçici: $TEMP_DIR"

# 1. Node modules temizliği (development için)
echo ""
echo "📦 Node Modules Temizliği..."
if [ -d "$PROJECT_DIR/node_modules" ]; then
    NODE_SIZE=$(du -sh "$PROJECT_DIR/node_modules" | cut -f1)
    echo "  Node modules boyutu: $NODE_SIZE"
    
    read -p "  Node modules silinsin mi? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR/node_modules"
        echo -e "${GREEN}✅ Node modules silindi${NC}"
    else
        echo -e "${YELLOW}⚠️ Node modules korundu${NC}"
    fi
fi

# 2. Build klasörü temizliği
echo ""
echo "🏗️ Build Klasörü Temizliği..."
if [ -d "$PROJECT_DIR/build" ]; then
    BUILD_SIZE=$(du -sh "$PROJECT_DIR/build" | cut -f1)
    echo "  Build klasörü boyutu: $BUILD_SIZE"
    
    read -p "  Build klasörü silinsin mi? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR/build"
        echo -e "${GREEN}✅ Build klasörü silindi${NC}"
    else
        echo -e "${YELLOW}⚠️ Build klasörü korundu${NC}"
    fi
fi

# 3. Log dosyaları temizliği
echo ""
echo "📝 Log Dosyaları Temizliği..."
LOG_FILES=(
    "/var/log/nginx/access.log"
    "/var/log/nginx/error.log"
    "/var/log/syslog"
    "/var/log/auth.log"
)

for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        LOG_SIZE=$(du -sh "$log_file" | cut -f1)
        echo "  $log_file: $LOG_SIZE"
        
        read -p "    Bu log dosyası temizlensin mi? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            > "$log_file"
            echo -e "${GREEN}✅ $log_file temizlendi${NC}"
        else
            echo -e "${YELLOW}⚠️ $log_file korundu${NC}"
        fi
    fi
done

# 4. Geçici dosyalar temizliği
echo ""
echo "🗑️ Geçici Dosyalar Temizliği..."
TEMP_SIZE=$(du -sh "$TEMP_DIR" | cut -f1)
echo "  Geçici dosyalar boyutu: $TEMP_SIZE"

# 7 günden eski geçici dosyaları sil
find "$TEMP_DIR" -type f -mtime +7 -delete 2>/dev/null
find "$TEMP_DIR" -type d -empty -delete 2>/dev/null

echo -e "${GREEN}✅ 7 günden eski geçici dosyalar silindi${NC}"

# 5. NPM cache temizliği
echo ""
echo "📦 NPM Cache Temizliği..."
if command -v npm &> /dev/null; then
    NPM_CACHE_SIZE=$(npm cache verify 2>&1 | grep -o '[0-9.]* MB' || echo "0 MB")
    echo "  NPM cache boyutu: $NPM_CACHE_SIZE"
    
    read -p "  NPM cache temizlensin mi? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm cache clean --force
        echo -e "${GREEN}✅ NPM cache temizlendi${NC}"
    else
        echo -e "${YELLOW}⚠️ NPM cache korundu${NC}"
    fi
fi

# 6. Git temizliği
echo ""
echo "🔧 Git Temizliği..."
if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    
    # Git garbage collection
    git gc --prune=now
    echo -e "${GREEN}✅ Git garbage collection tamamlandı${NC}"
    
    # Git reflog temizliği (30 günden eski)
    git reflog expire --expire=30.days.ago --expire-unreachable=now --all
    echo -e "${GREEN}✅ Git reflog temizlendi${NC}"
fi

# 7. Disk kullanımı raporu
echo ""
echo "📊 Disk Kullanımı Raporu:"
echo "=========================="
df -h

# 8. Temizlik sonrası boyut hesaplama
echo ""
echo "📈 Temizlik Sonrası Durum:"
if [ -d "$PROJECT_DIR" ]; then
    PROJECT_SIZE=$(du -sh "$PROJECT_DIR" | cut -f1)
    echo "  Proje klasörü boyutu: $PROJECT_SIZE"
fi

echo ""
echo -e "${GREEN}✅ Temizlik işlemi tamamlandı!${NC}" 