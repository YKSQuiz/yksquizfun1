# Database Scripts

Bu klasör Firebase veritabanı işlemleri için kullanılan script'leri içerir.

## Script'ler

### csv-to-firebase.js
CSV dosyalarından Firebase'e veri aktarımı yapar.
```bash
node scripts/database/csv-to-firebase.js
```

### delete-questions.js
Belirtilen soruları veritabanından siler.
```bash
node scripts/database/delete-questions.js
```

### fix-daily-activity-decimals-admin.js
Admin kullanıcılarının günlük aktivite verilerindeki ondalık sayıları düzeltir.
```bash
node scripts/database/fix-daily-activity-decimals-admin.js
```

### fix-session-time-location.js
Oturum zamanı ve konum verilerini düzeltir.
```bash
node scripts/database/fix-session-time-location.js
```

### fixSessionTimes.js
Oturum zamanlarını düzeltir.
```bash
node scripts/database/fixSessionTimes.js
```

### validate-csv.js
CSV dosyalarının formatını ve verilerini doğrular.
```bash
node scripts/database/validate-csv.js
```

## Kullanım Notları

- Script'leri çalıştırmadan önce Firebase konfigürasyonunun doğru olduğundan emin olun
- Production ortamında çalıştırmadan önce test ortamında deneyin
- Büyük veri setleri için script'lerin uzun sürebileceğini unutmayın 