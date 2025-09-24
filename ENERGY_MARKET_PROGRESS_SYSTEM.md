# Enerji Market Progress Bar Sistemi - Tasarım ve Süreç

## 📋 Genel Bakış

Enerji Market sekmesi, kullanıcıların enerji limiti ve yenilenme hızını geliştirmelerini sağlayan modern bir progress bar sistemi sunar. Bu sistem, görsel feedback ve interaktif satın alma deneyimi ile kullanıcıların ilerlemelerini takip etmelerini sağlar.

## 🎨 Tasarım Sistemi

### Progress Bar Tasarımı

#### **Segmentli Progress Bar Yapısı:**
```css
.segmented-progress-bar {
  width: 100%;
  height: 40px;
  background: #2a2a2a;
  border: 3px solid #444;
  border-radius: 20px;
  display: flex;
  overflow: hidden;
  position: relative;
}

.progress-segment {
  flex: 1;
  height: 100%;
  border-right: 2px solid #333;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
}

.progress-segment:last-child {
  border-right: none;
}

.progress-segment.completed {
  background: linear-gradient(90deg, #4CAF50, #45a049);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.progress-segment.available {
  background: linear-gradient(90deg, #FF9800, #F57C00);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  animation: pulse 2s infinite;
}

.progress-segment.locked {
  background: #555;
  opacity: 0.6;
}

.progress-segment:hover.available {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255,152,0,0.4);
}
```

#### **Yüzde Gösterimi:**
```css
.progress-percentage {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  z-index: 10;
}
```

### Satın Alma Butonları

#### **Buton Tasarımı:**
```css
.purchase-button {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(76,175,80,0.3);
  position: relative;
  overflow: hidden;
}

.purchase-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(76,175,80,0.4);
}

.purchase-button:active {
  transform: translateY(0);
}

.purchase-button.disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.purchase-button.disabled:hover {
  transform: none;
  box-shadow: none;
}
```

## ⚙️ Enerji Limiti Sistemi

### **Başlangıç Durumu:**
- **Mevcut Limit**: 100
- **Maksimum Limit**: 250
- **Artış Miktarı**: 5'er 5'er

### **Satın Alma Tablosu:**

| Seviye | Yeni Limit | Fiyat (Coin) | Durum |
|--------|------------|--------------|-------|
| 1      | 105        | 1000         | ✅ Mevcut |
| 2      | 110        | 1500         | 🔒 Kilitli |
| 3      | 115        | 2000         | 🔒 Kilitli |
| 4      | 120        | 2500         | 🔒 Kilitli |
| 5      | 125        | 3000         | 🔒 Kilitli |
| ...    | ...        | ...          | ...   |
| 30     | 250        | 15000        | 🔒 Kilitli |

### **Progress Hesaplama:**
```typescript
const calculateEnergyLimitProgress = (currentLimit: number): number => {
  const minLimit = 100;
  const maxLimit = 250;
  return Math.min(((currentLimit - minLimit) / (maxLimit - minLimit)) * 100, 100);
};
```

### **Satın Alma Süreci:**
1. Kullanıcı mevcut seviyesini görür
2. Bir sonraki seviyeyi satın alabilir
3. Butona tıklar → Onay dialogu açılır
4. Onaylar → Satın alma gerçekleşir
5. Progress bar güncellenir

## ⚡ Enerji Yenileme Hızı Sistemi

### **Başlangıç Durumu:**
- **Mevcut Hız**: 300 saniye/enerji
- **Maksimum Hız**: 100 saniye/enerji
- **Azalış Miktarı**: 10'ar 10'ar

### **Satın Alma Tablosu:**

| Seviye | Yeni Hız (saniye) | Fiyat (Coin) | Durum |
|--------|-------------------|--------------|-------|
| 1      | 290              | 1000         | ✅ Mevcut |
| 2      | 280              | 1500         | 🔒 Kilitli |
| 3      | 270              | 2000         | 🔒 Kilitli |
| 4      | 260              | 2500         | 🔒 Kilitli |
| 5      | 250              | 3000         | 🔒 Kilitli |
| ...    | ...              | ...          | ...   |
| 20     | 100              | 20000        | 🔒 Kilitli |

### **Progress Hesaplama:**
```typescript
const calculateEnergySpeedProgress = (currentSpeed: number): number => {
  const maxSpeed = 300;
  const minSpeed = 100;
  return Math.min(((maxSpeed - currentSpeed) / (maxSpeed - minSpeed)) * 100, 100);
};
```

## 🎯 Kullanıcı Deneyimi

### **Görsel Feedback:**
- **Tamamlanmış Segmentler**: Yeşil renk
- **Satın Alınabilir Segmentler**: Turuncu renk + pulse animasyonu
- **Kilitli Segmentler**: Gri renk + opacity
- **Yüzde Gösterimi**: Beyaz yazı, sağ üst köşede

### **Interaktif Özellikler:**
- **Hover Efektleri**: Butonlar büyür ve glow efekti
- **Click Feedback**: Butonlar küçülür
- **Animasyonlar**: Smooth geçişler
- **Onay Dialogu**: Satın alma öncesi onay

### **Responsive Tasarım:**
```css
@media (max-width: 768px) {
  .segmented-progress-bar {
    height: 32px;
  }
  
  .purchase-button {
    padding: 10px 16px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .segmented-progress-bar {
    height: 28px;
  }
  
  .progress-percentage {
    font-size: 12px;
  }
}
```

## 🔧 Teknik Implementasyon

### **React Bileşeni Yapısı:**
```typescript
interface EnergyUpgrade {
  level: number;
  value: number;
  price: number;
  isCompleted: boolean;
  isAvailable: boolean;
}

interface ProgressBarProps {
  upgrades: EnergyUpgrade[];
  currentValue: number;
  maxValue: number;
  onUpgrade: (upgrade: EnergyUpgrade) => void;
  title: string;
  subtitle: string;
  unit: string;
}
```

### **Satın Alma Fonksiyonu:**
```typescript
const handleEnergyUpgrade = async (upgrade: EnergyUpgrade) => {
  if (!user || user.coins < upgrade.price) {
    setErrorMessage('Yetersiz coin!');
    return;
  }

  try {
    setLoading(true);
    
    // Firebase güncelleme
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      coins: increment(-upgrade.price),
      energyLimit: upgrade.value, // veya energyRegenSpeed
    });

    // Local state güncelleme
    updateUser({
      ...user,
      coins: user.coins - upgrade.price,
      energyLimit: upgrade.value, // veya energyRegenSpeed
    });

    setSuccessMessage('Satın alma başarılı!');
  } catch (error) {
    setErrorMessage('Satın alma sırasında hata oluştu.');
  } finally {
    setLoading(false);
  }
};
```

## 🎨 Animasyon Sistemi

### **Progress Bar Animasyonları:**
```css
@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.8; 
    transform: scale(1.02);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow {
  0%, 100% { 
    box-shadow: 0 4px 8px rgba(76,175,80,0.3);
  }
  50% { 
    box-shadow: 0 4px 12px rgba(76,175,80,0.6);
  }
}
```

### **Buton Animasyonları:**
```css
.purchase-button {
  animation: slideIn 0.5s ease;
}

.purchase-button:hover {
  animation: glow 1s infinite;
}
```

## 📊 Veri Yönetimi

### **Firebase Veri Yapısı:**
```typescript
interface User {
  id: string;
  coins: number;
  energyLimit: number;
  energyRegenSpeed: number;
  // ... diğer alanlar
}
```

### **Local State Yönetimi:**
```typescript
const [energyUpgrades, setEnergyUpgrades] = useState<EnergyUpgrade[]>([]);
const [speedUpgrades, setSpeedUpgrades] = useState<EnergyUpgrade[]>([]);
const [loading, setLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
```

## 🎯 Onay Dialog Sistemi

### **Dialog Tasarımı:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  upgrade: EnergyUpgrade | null;
  userCoins: number;
  onConfirm: () => void;
  onCancel: () => void;
}
```

### **Dialog İçeriği:**
- **Başlık**: "Satın Alma Onayı"
- **Açıklama**: "Bu geliştirmeyi satın almak istediğinizden emin misiniz?"
- **Detaylar**: Yeni değer, fiyat, mevcut coin
- **Butonlar**: "İptal" ve "Satın Al"

## 🚀 Gelecek Geliştirmeler

### **Planlanan Özellikler:**
1. **Toplu Satın Alma**: Birden fazla seviye satın alma
2. **İndirim Sistemi**: Belirli seviyelerde indirimler
3. **Başarım Sistemi**: Belirli seviyelere ulaşınca ödüller
4. **Ses Efektleri**: Satın alma sırasında ses
5. **Konfeti Efekti**: Maksimum seviyeye ulaşınca kutlama

### **Performans Optimizasyonları:**
1. **Lazy Loading**: Büyük upgrade listeleri için
2. **Caching**: Firebase verilerini cache'leme
3. **Debouncing**: Hızlı tıklamaları engelleme
4. **Virtual Scrolling**: Çok sayıda upgrade için

## 📱 Responsive Davranış

### **Desktop (1200px+):**
- İki progress bar yan yana
- Büyük butonlar
- Detaylı bilgi gösterimi

### **Tablet (768px-1199px):**
- Progress bar'lar alt alta
- Orta boy butonlar
- Kısaltılmış bilgi

### **Mobile (480px-767px):**
- Tek sütun layout
- Küçük butonlar
- Minimal bilgi

### **Small Mobile (<480px):**
- Kompakt tasarım
- Touch-friendly butonlar
- Sadece gerekli bilgiler

## 🐛 Sorun Giderme

### **Yaygın Sorunlar:**
1. **Progress Bar Güncellenmiyor**: State güncelleme kontrolü
2. **Buton Tıklanmıyor**: Event handler kontrolü
3. **Firebase Senkronizasyon**: Network bağlantısı kontrolü
4. **Animasyon Çalışmıyor**: CSS class kontrolü

### **Debug Araçları:**
```typescript
// Progress hesaplama debug
console.log('Current Value:', currentValue);
console.log('Max Value:', maxValue);
console.log('Progress:', progress);

// Satın alma debug
console.log('Upgrade:', upgrade);
console.log('User Coins:', user.coins);
console.log('Can Afford:', user.coins >= upgrade.price);
```

---

*Bu dokümantasyon, Enerji Market sekmesindeki progress bar sisteminin teknik detaylarını ve kullanıcı deneyimini açıklamaktadır. Geliştirme sürecinde bu dokümantasyonu referans olarak kullanın.* 