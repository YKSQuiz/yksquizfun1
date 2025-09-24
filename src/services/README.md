# Services

Bu klasör uygulama servislerini ve API katmanını içerir.

## 📁 Klasör Yapısı

```
services/
├── firebase/         # Firebase servisleri
│   ├── config.ts     # Firebase konfigürasyonu
│   ├── user.ts       # Kullanıcı servisleri
│   └── index.ts      # Export dosyası
├── firebase.ts       # Ana Firebase servis dosyası (legacy)
└── README.md         # Bu dosya
```

## 🔥 Firebase Servisleri

### Konfigürasyon (config.ts)
```typescript
// Firebase uygulama konfigürasyonu
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Kullanıcı Servisleri (user.ts)
```typescript
// Oturum süresi güncelleme
export async function updateSessionTime(uid: string, sessionDuration: number)

// Enerji güncelleme
export async function updateUserEnergy(uid: string, newEnergy: number, lastUpdate: string)
```

## 🔧 Servis Standartları

### Error Handling
```typescript
export const safeApiCall = async <T>(
  apiFunction: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const data = await apiFunction();
    return { data, error: null };
  } catch (error) {
    console.error('API Error:', error);
    return { data: null, error: error.message };
  }
};
```

### Type Safety
- TypeScript ile tip güvenliği sağlanır
- Interface'ler types/ klasöründe tanımlanır
- Export edilen fonksiyonlar tip güvenli olmalı

## 📚 Best Practices

### Service Organization
- **Single Responsibility**: Her servis tek bir sorumluluğa sahip olmalı
- **Dependency Injection**: Servisler arası bağımlılıkları minimize edin
- **Error Boundaries**: Hata yönetimi için boundary'ler kullanın
- **Type Safety**: TypeScript ile tip güvenliği sağlayın

### Performance
- **Caching**: Sık kullanılan verileri cache'leyin
- **Lazy Loading**: Servisleri gerektiğinde yükleyin
- **Batch Operations**: Toplu işlemler için batch API'leri kullanın

### Security
- **Input Validation**: Tüm girdileri doğrulayın
- **Authentication**: Her API çağrısında kimlik doğrulaması yapın
- **Authorization**: Kullanıcı yetkilerini kontrol edin
- **Rate Limiting**: API çağrılarını sınırlayın

## 🔄 Migration Guide

### Eski Yapıdan Yeni Yapıya
1. **Servisleri** uygun klasörlere taşıyın
2. **Import yollarını** güncelleyin
3. **Error handling** ekleyin
4. **Type definitions** güncelleyin

### Breaking Changes
- Firebase servisleri ayrı dosyalara bölündü
- Error handling geliştirildi
- Type safety artırıldı 