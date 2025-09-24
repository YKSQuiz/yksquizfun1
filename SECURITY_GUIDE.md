# 🔒 YKS Quiz Güvenlik Rehberi

## ⚠️ ÖNEMLİ GÜVENLİK UYARILARI

Bu rehber, YKS Quiz uygulamasının güvenlik ayarlarını ve hassas bilgilerin nasıl korunacağını açıklar.

## 🚨 ACİL GÜVENLİK ÖNLEMLERİ

### 1. Environment Variables Kurulumu

#### Development için:
```bash
# .env.local dosyası oluşturun (git'e commit edilmemeli)
cp .env.example .env.local
```

#### .env.local içeriği:
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=yksquizv2.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=yksquizv2
REACT_APP_FIREBASE_STORAGE_BUCKET=yksquizv2.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id_here
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

### 2. Android Keystore Güvenliği

#### Keystore şifrelerini environment variable olarak ayarlayın:
```bash
# Windows PowerShell
$env:KEYSTORE_PASSWORD="your_secure_keystore_password"
$env:KEY_PASSWORD="your_secure_key_password"

# Linux/Mac
export KEYSTORE_PASSWORD="your_secure_keystore_password"
export KEY_PASSWORD="your_secure_key_password"
```

#### APK build için:
```bash
npm run build:apk
```

### 3. Firebase Service Account

#### Service account key'i güvenli konuma taşıyın:
```bash
# Environment variable olarak ayarlayın
export FIREBASE_SERVICE_ACCOUNT_PATH="/secure/path/to/serviceAccountKey.json"

# Veya scripts/database/ klasörüne koyun
cp serviceAccountKey.json scripts/database/
```

### 4. VPS Deployment Güvenliği

#### Deployment environment dosyası:
```bash
# scripts/deployment/.env dosyası oluşturun
cp scripts/deployment/env.example scripts/deployment/.env
```

#### .env içeriği:
```env
VPS_HOST=your_vps_host
VPS_USER=your_username
VPS_PASS=your_secure_password
VPS_EMAIL=your_email@example.com
```

## 🔐 GÜVENLİK KONTROL LİSTESİ

### ✅ Yapılması Gerekenler:

- [ ] Firebase API key'i yenileyin
- [ ] Android keystore şifrelerini değiştirin
- [ ] VPS şifresini değiştirin
- [ ] Service account key'i yeniden oluşturun
- [ ] Environment variables'ları ayarlayın
- [ ] .env dosyalarını git'e commit etmeyin
- [ ] Hassas dosyaları güvenli konuma taşıyın

### ❌ Yapılmaması Gerekenler:

- [ ] API key'leri kodda açık bırakmayın
- [ ] Şifreleri hardcode etmeyin
- [ ] Service account key'i git'e commit etmeyin
- [ ] Production'da debug logları açık bırakmayın
- [ ] VPS bilgilerini açık paylaşmayın

## 🛡️ EK GÜVENLİK ÖNLEMLERİ

### 1. Firebase Security Rules
```javascript
// Firestore Security Rules örneği
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. API Key Kısıtlamaları
- Firebase Console'da API key kısıtlamaları ayarlayın
- Sadece gerekli domain'lere izin verin
- Referrer kısıtlamaları ekleyin

### 3. VPS Güvenliği
- SSH key authentication kullanın
- Firewall kurallarını sıkılaştırın
- Düzenli güvenlik güncellemeleri yapın
- Backup'ları şifreleyin

## 🚨 ACİL DURUM PLANI

### Eğer güvenlik ihlali tespit edilirse:

1. **Hemen yapın:**
   - Tüm şifreleri değiştirin
   - API key'leri yenileyin
   - Service account'ları devre dışı bırakın
   - VPS erişimini kontrol edin

2. **Sonraki adımlar:**
   - Log'ları inceleyin
   - Etkilenen kullanıcıları bilgilendirin
   - Güvenlik açıklarını kapatın
   - Monitoring sistemini güçlendirin

## 📞 DESTEK

Güvenlik sorunları için:
- Email: security@yksquiz.fun
- Acil durum: +90 XXX XXX XX XX

## 📝 GÜNCELLEME GEÇMİŞİ

- **2024-12-XX**: İlk güvenlik rehberi oluşturuldu
- **2024-12-XX**: Environment variables sistemi eklendi
- **2024-12-XX**: Android keystore güvenliği sağlandı
- **2024-12-XX**: Debug logları production için güvenli hale getirildi

---

**⚠️ UYARI**: Bu rehberdeki tüm şifreler ve API key'ler örnek amaçlıdır. Gerçek değerleri kullanmayın!
