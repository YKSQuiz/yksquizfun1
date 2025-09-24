#!/bin/bash

# Health Check Script
# Bu script deployment sonrası sistem sağlığını kontrol eder

echo "🔍 Sistem sağlık kontrolü başlatılıyor..."

# Renkli output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Kontrol fonksiyonları
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✅ $service çalışıyor${NC}"
        return 0
    else
        echo -e "${RED}❌ $service çalışmıyor${NC}"
        return 1
    fi
}

check_port() {
    local port=$1
    if netstat -tlnp | grep -q ":$port "; then
        echo -e "${GREEN}✅ Port $port açık${NC}"
        return 0
    else
        echo -e "${RED}❌ Port $port kapalı${NC}"
        return 1
    fi
}

check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file mevcut${NC}"
        return 0
    else
        echo -e "${RED}❌ $file bulunamadı${NC}"
        return 1
    fi
}

check_http() {
    local url=$1
    if curl -f -s "$url" > /dev/null; then
        echo -e "${GREEN}✅ $url erişilebilir${NC}"
        return 0
    else
        echo -e "${RED}❌ $url erişilemiyor${NC}"
        return 1
    fi
}

echo "📊 Sistem Durumu:"
echo "=================="

# Nginx kontrolü
check_service nginx

# Port kontrolleri
check_port 80
check_port 443

# Dosya kontrolleri
check_file "/var/www/yksquiz.fun/public/index.html"
check_file "/etc/nginx/sites-available/yksquiz.fun"

# HTTP kontrolleri
echo ""
echo "🌐 Web Erişimi:"
echo "==============="
check_http "http://localhost"
check_http "http://yksquiz.fun"

# Disk kullanımı
echo ""
echo "💾 Disk Kullanımı:"
echo "=================="
df -h /var/www

# RAM kullanımı
echo ""
echo "🧠 RAM Kullanımı:"
echo "================="
free -h

# Nginx logları (son 10 satır)
echo ""
echo "📝 Son Nginx Logları:"
echo "====================="
echo "Error Log:"
sudo tail -5 /var/log/nginx/error.log
echo ""
echo "Access Log:"
sudo tail -5 /var/log/nginx/access.log

# SSL sertifikası kontrolü
echo ""
echo "🔒 SSL Durumu:"
echo "=============="
if command -v certbot &> /dev/null; then
    sudo certbot certificates
else
    echo -e "${YELLOW}⚠️  Certbot kurulu değil${NC}"
fi

# Performans önerileri
echo ""
echo "💡 Öneriler:"
echo "============="

# Disk kullanımı %80'den fazlaysa uyarı
DISK_USAGE=$(df /var/www | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Disk kullanımı yüksek: ${DISK_USAGE}%${NC}"
fi

# RAM kullanımı %90'dan fazlaysa uyarı
RAM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ "$RAM_USAGE" -gt 90 ]; then
    echo -e "${YELLOW}⚠️  RAM kullanımı yüksek: ${RAM_USAGE}%${NC}"
fi

echo ""
echo "🎯 Kontrol Tamamlandı!"
echo "======================" 