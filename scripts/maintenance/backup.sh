#!/bin/bash

# Backup Script
# Bu script proje dosyalarını ve veritabanını yedekler

echo "💾 Yedekleme işlemi başlatılıyor..."

# Renkli output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Konfigürasyon
BACKUP_DIR="/var/backups/yksquiz"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/var/www/yksquiz.fun"
DB_NAME="yksquiz"

# Backup klasörünü oluştur
mkdir -p "$BACKUP_DIR"

echo "📁 Backup klasörü: $BACKUP_DIR"

# 1. Proje dosyalarını yedekle
echo ""
echo "📦 Proje Dosyaları Yedekleniyor..."
PROJECT_BACKUP="$BACKUP_DIR/project_$DATE.tar.gz"

if tar -czf "$PROJECT_BACKUP" -C "$PROJECT_DIR" .; then
    echo -e "${GREEN}✅ Proje dosyaları yedeklendi: $PROJECT_BACKUP${NC}"
else
    echo -e "${RED}❌ Proje dosyaları yedeklenemedi${NC}"
    exit 1
fi

# 2. Veritabanı yedekleme (Firebase için)
echo ""
echo "🗄️ Firebase Veritabanı Yedekleme..."
FIREBASE_BACKUP="$BACKUP_DIR/firebase_$DATE.json"

# Firebase export komutu (eğer firebase-tools kuruluysa)
if command -v firebase &> /dev/null; then
    if firebase firestore:export "$FIREBASE_BACKUP" --project=yksquiz; then
        echo -e "${GREEN}✅ Firebase veritabanı yedeklendi: $FIREBASE_BACKUP${NC}"
    else
        echo -e "${YELLOW}⚠️ Firebase export başarısız, manuel yedekleme gerekli${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Firebase CLI bulunamadı, manuel yedekleme gerekli${NC}"
fi

# 3. Nginx konfigürasyonu yedekle
echo ""
echo "⚙️ Nginx Konfigürasyonu Yedekleniyor..."
NGINX_BACKUP="$BACKUP_DIR/nginx_$DATE.tar.gz"

if tar -czf "$NGINX_BACKUP" -C /etc/nginx sites-available sites-enabled; then
    echo -e "${GREEN}✅ Nginx konfigürasyonu yedeklendi: $NGINX_BACKUP${NC}"
else
    echo -e "${YELLOW}⚠️ Nginx konfigürasyonu yedeklenemedi${NC}"
fi

# 4. SSL sertifikalarını yedekle
echo ""
echo "🔒 SSL Sertifikaları Yedekleniyor..."
SSL_BACKUP="$BACKUP_DIR/ssl_$DATE.tar.gz"

if tar -czf "$SSL_BACKUP" -C /etc/letsencrypt live; then
    echo -e "${GREEN}✅ SSL sertifikaları yedeklendi: $SSL_BACKUP${NC}"
else
    echo -e "${YELLOW}⚠️ SSL sertifikaları yedeklenemedi${NC}"
fi

# 5. Backup boyutunu hesapla
echo ""
echo "📊 Backup Boyutu:"
echo "=================="
du -h "$BACKUP_DIR"/*_$DATE.*

# 6. Eski yedekleri temizle (30 günden eski)
echo ""
echo "🧹 Eski Yedekler Temizleniyor..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.json" -mtime +30 -delete

echo -e "${GREEN}✅ 30 günden eski yedekler silindi${NC}"

# 7. Backup raporu oluştur
REPORT_FILE="$BACKUP_DIR/backup_report_$DATE.txt"
{
    echo "YKS Quiz Backup Raporu"
    echo "======================"
    echo "Tarih: $(date)"
    echo "Backup Klasörü: $BACKUP_DIR"
    echo ""
    echo "Yedeklenen Dosyalar:"
    echo "- Proje: $PROJECT_BACKUP"
    echo "- Firebase: $FIREBASE_BACKUP"
    echo "- Nginx: $NGINX_BACKUP"
    echo "- SSL: $SSL_BACKUP"
    echo ""
    echo "Backup Boyutu:"
    du -h "$BACKUP_DIR"/*_$DATE.*
} > "$REPORT_FILE"

echo ""
echo -e "${GREEN}✅ Yedekleme tamamlandı!${NC}"
echo "📄 Rapor: $REPORT_FILE"

# 8. Disk kullanımını kontrol et
echo ""
echo "💾 Disk Kullanımı:"
df -h "$BACKUP_DIR" 