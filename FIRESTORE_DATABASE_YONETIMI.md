# 🔥 Firestore Database Yönetimi Rehberi

## 📁 Gerekli Dosyalar

### ✅ Korunan Dosyalar:
- `serviceAccountKey.json` - Firebase Admin SDK service account key
- `fix-daily-activity-decimals-admin.js` - Veri güncelleme scripti
- `FIRESTORE_DATABASE_YONETIMI.md` - Bu rehber dosyası

### 🗑️ Silinen Dosyalar:
- `fix-daily-activity-decimals.js` - Yetki hatası veren script
- `check-daily-activity-decimals.js` - Kontrol scripti
- `fix-daily-activity-decimals-env.js` - Environment variable scripti

## 🚀 Firestore Veri Güncelleme

### Prerequisites:
1. **Firebase Admin SDK yüklü:** `npm install firebase-admin`
2. **Service account key dosyası:** `serviceAccountKey.json`
3. **Yetki:** Firebase Console'dan service account key indirilmiş olmalı

### Veri Güncelleme Adımları:

#### 1. Service Account Key İndirme:
```
1. Firebase Console'a git: https://console.firebase.google.com/project/yksquizv2
2. Project Settings > Service Accounts
3. "Generate new private key" butonuna tıkla
4. JSON dosyasını proje klasörüne koy ve "serviceAccountKey.json" olarak adlandır
```

#### 2. Script Çalıştırma:
```bash
node fix-daily-activity-decimals-admin.js
```

#### 3. Yeni Script Oluşturma:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateFirestoreData() {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Veri güncelleme işlemleri burada
      await userDoc.ref.update({
        // güncellenecek alanlar
      });
    }
    
    console.log('✅ Güncelleme tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

updateFirestoreData();
```

## 📊 Database Yapısı

### Collections:
- **users** - Kullanıcı profilleri ve istatistikleri
- **questions** - Quiz soruları

### Users Collection Yapısı:
```javascript
{
  id: string,
  displayName: string,
  email: string,
  avatar: string,
  stats: {
    totalQuizzes: number,
    correctAnswers: number,
    totalQuestions: number,
            dailyActivity: {
          [date]: {
            questionsSolved: number,
            correctAnswers: number
          }
        },
    level: number,
    experience: number,
    experienceToNext: number
  },
  jokers: {
    eliminate: { count: number, lastReset: string },
    extraTime: { count: number, lastReset: string },
    doubleAnswer: { count: number, lastReset: string },
    autoCorrect: { count: number, lastReset: string }
  },
  jokersUsed: {
    eliminate: number,
    extraTime: number,
    doubleAnswer: number,
    autoCorrect: number
  },
  energy: number, // 0-100
  lastEnergyUpdate: string,
  coins: number,
  totalSessionTime: number
}
```

## 🔧 Yaygın İşlemler

### 1. Tüm Kullanıcıları Listele:
```javascript
const usersSnapshot = await db.collection('users').get();
usersSnapshot.docs.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

### 2. Belirli Kullanıcıyı Güncelle:
```javascript
await db.collection('users').doc(userId).update({
  'stats.level': newLevel,
  'stats.experience': newExperience
});
```

### 3. Batch İşlemler:
```javascript
const batch = db.batch();
usersSnapshot.docs.forEach(doc => {
  batch.update(doc.ref, { /* güncellemeler */ });
});
await batch.commit();
```

### 4. Veri Silme:
```javascript
await db.collection('users').doc(userId).delete();
```

## ⚠️ Güvenlik Notları

### Service Account Key Güvenliği:
- ✅ Proje klasöründe tutun
- ✅ Git'e commit etmeyin (.gitignore'a ekleyin)
- ✅ Düzenli olarak yenileyin
- ❌ Public repository'de paylaşmayın

### Firestore Güvenlik Kuralları:
```javascript
// Örnek güvenlik kuralları
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🎯 Optimizasyon İpuçları

### 1. Veri Boyutu:
- Eski günlük verileri arşivleyin
- Gereksiz alanları kaldırın

### 2. Performans:
- Batch işlemler kullanın
- İndeksler oluşturun
- Pagination kullanın

### 3. Maliyet:
- Gereksiz okuma/yazma işlemlerini azaltın
- Offline cache kullanın
- Veri arşivleme yapın

## 📝 Son Güncellemeler

### 2025-07-15:
- ✅ `timeSpent` alanı tamamen kaldırıldı
- ✅ Kullanılmayan script dosyaları silindi
- ✅ Service account key sistemi kuruldu
- ✅ Database yönetim rehberi oluşturuldu

## 🆘 Sorun Giderme

### Yetki Hatası:
```
❌ Hata: Missing or insufficient permissions
```
**Çözüm:** Service account key dosyasını kontrol edin

### Bağlantı Hatası:
```
❌ Hata: Network error
```
**Çözüm:** İnternet bağlantısını kontrol edin

### Veri Bulunamadı:
```
❌ Hata: Document does not exist
```
**Çözüm:** Collection ve document ID'lerini kontrol edin

---

**Son Güncelleme:** 2025-07-15  
**Oluşturan:** YKS Quiz Development Team 