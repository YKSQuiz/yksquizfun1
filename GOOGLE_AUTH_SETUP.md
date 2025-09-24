# Google Authentication Kurulum Rehberi

Bu rehber, YKS Quiz uygulamasına Google ile giriş yapma özelliğinin nasıl kurulacağını açıklar.

## Firebase Console Ayarları

### 1. Google Authentication'ı Etkinleştirin

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. `yksquizv2` projesini seçin
3. Sol menüden **Authentication**'ı seçin
4. **Sign-in method** sekmesine gidin
5. **Google** sağlayıcısını bulun ve **Enable** butonuna tıklayın
6. **Project support email** alanına geçerli bir email adresi girin
7. **Save** butonuna tıklayın

### 2. Domain Yetkilendirmesi

Firebase Console'da **Authentication > Settings > Authorized domains** bölümünde şu domainleri ekleyin:

- `localhost` (geliştirme için)
- `yksquiz.fun` (production domain)
- `10.0.2.2` (Android Studio emulator için)
- `127.0.0.1` (yerel geliştirme için)

### 3. OAuth 2.0 Client ID (Opsiyonel)

Eğer özel bir OAuth 2.0 client ID kullanmak istiyorsanız:

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. `yksquizv2` projesini seçin
3. **APIs & Services > Credentials**'a gidin
4. **Create Credentials > OAuth 2.0 Client IDs**'i seçin
5. **Web application** tipini seçin
6. **Authorized JavaScript origins**'e şu URL'leri ekleyin:
   - `http://localhost:3000`
   - `https://yksquiz.fun`
   - `http://10.0.2.2:3000`

## Uygulama Özellikleri

### Mobil Uyumluluk
- Mobil cihazlarda popup yerine redirect kullanılır
- Desktop cihazlarda popup kullanılır
- Responsive tasarım ile tüm ekran boyutlarında uyumlu

### Güvenlik Özellikleri
- Domain kontrolü
- Hata yönetimi
- Kullanıcı dostu hata mesajları
- Otomatik profil oluşturma

### Kullanıcı Deneyimi
- Modern ve şık tasarım
- Smooth animasyonlar
- Loading durumları
- Hata bildirimleri

## Test Etme

### Yerel Geliştirme
```bash
npm start
```
Tarayıcıda `http://localhost:3000/login` adresine gidin ve Google ile giriş butonunu test edin.

### Mobil Test
- Android Studio emulator'da test edin
- Gerçek mobil cihazda test edin
- Farklı tarayıcılarda test edin

## Sorun Giderme

### Yaygın Hatalar

1. **"Google ile giriş devre dışı" hatası**
   - Firebase Console'da Google Authentication'ın etkin olduğundan emin olun

2. **"Bu domain'den giriş yapılamıyor" hatası**
   - Firebase Console'da domain yetkilendirmesi yapın

3. **"Popup engellendi" hatası**
   - Tarayıcı popup engelleyicisini kapatın
   - Mobil cihazlarda redirect kullanılır

4. **"Ağ bağlantısı hatası"**
   - İnternet bağlantınızı kontrol edin
   - Firebase servislerinin erişilebilir olduğundan emin olun

### Debug Bilgileri

Console'da şu bilgileri kontrol edin:
- Firebase konfigürasyonu
- Domain kontrolü
- User Agent bilgileri
- Authentication durumu

## Güvenlik Notları

- Google Authentication güvenli ve güvenilir bir yöntemdir
- Kullanıcı bilgileri Google tarafından korunur
- Firebase güvenlik kuralları uygulanır
- HTTPS zorunludur (production'da)

## Performans

- Lazy loading ile optimize edilmiştir
- Minimal bundle boyutu
- Hızlı yükleme süreleri
- Mobil optimizasyonu

## Destek

Herhangi bir sorun yaşarsanız:
1. Console hatalarını kontrol edin
2. Firebase Console ayarlarını doğrulayın
3. Network sekmesinde istekleri inceleyin
4. Gerekirse Firebase desteğine başvurun
