## OneSignal Entegrasyonu (Capacitor 7 + Android)

Bu doküman, mevcut React + Capacitor 7 Android uygulamanıza OneSignal Push Bildirimlerini sorunsuz şekilde eklemeniz için uçtan uca bir rehber sağlar. Adımlar proje yapınıza (Android/Capacitor 7) ve mevcut Gradle ayarlarınıza göre hazırlanmıştır.

### Önkoşullar
- Android Studio kurulu olmalı.
- Firebase projesi (FCM) oluşturulmuş olmalı.
- `google-services.json` dosyanız indirilebilir durumda olmalı (Firebase Console > Proje Ayarları > Android uygulaması > `google-services.json`).
- Node 16+ ve Capacitor 7 kullanılıyor (paketleriniz bu sürüme uygun).

---

### 1) OneSignal panelinde uygulama oluşturma
1. OneSignal hesabı oluşturun ve panele giriş yapın.
2. “New App/Website” ile yeni bir uygulama oluşturun.
3. Platform olarak Android (FCM) seçin.
4. OneSignal sizden Firebase bağlantısı isteyecektir. Aşağıdaki 2 yoldan biriyle ilerleyin:
   - Google ile bağla (önerilir): OneSignal hesabınızı Firebase projenizle bağlayın.
   - Manuel: Firebase’den FCM bilgilerini/`google-services.json` dosyasını yükleyin veya istenen anahtarları girin (panelde adım adım yönlendirir).

Not: Yeni FCM akışında OneSignal, çoğunlukla `google-services.json` veya Google Cloud bağlantısı ister. Panelde gösterilen yönergeleri izleyin.

---

### 2) Projeye OneSignal Capacitor eklentisini ekleme
Uygulamanın kök klasöründe aşağıdaki komutu çalıştırın:

```bash
npm i @onesignal/capacitor-plugin
```

Capacitor ile senkronize edin:

```bash
npx cap sync android
```

> Bu işlem Android tarafına gerekli native bağımlılıkları ekler.

---

### 3) Firebase `google-services.json` dosyasını ekleme
- Dosyayı şu konuma yerleştirin: `android/app/google-services.json`
- Projenizde Android seviyesinde Google Services eklentisi zaten tanımlı:
  - `android/build.gradle` içinde: `classpath 'com.google.gms:google-services:4.4.2'`
  - `android/app/build.gradle` içinde otomatik uygulama: `apply plugin: 'com.google.gms.google-services'` (dosya mevcutsa uygulanıyor)

Bu sayede FCM kenar konfigürasyonu hazır olacaktır.

---

### 4) AndroidManifest izinleri (Android 13+ için önemlidir)
Android 13 (API 33) ve üzeri için çalışma zamanında bildirim izni gerekir. Aşağıdaki izin satırının Manifest’te bulunduğundan emin olun:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Manifest konumu: `android/app/src/main/AndroidManifest.xml`

Projede halihazırda `INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `VIBRATE` vb. izinler mevcut. `POST_NOTIFICATIONS` yoksa ekleyin.

> OneSignal SDK, çalışma zamanında izin isteme akışını JavaScript API’si üzerinden başlatmanızı bekler (aşağıdaki Kod Entegrasyonu bölümüne bakın).

---

### 5) React/Capacitor tarafında kod entegrasyonu
OneSignal’ı uygulama açılışında initialize edin ve Android 13+ için bildirim iznini isteyin. Örnek kullanım (React, `src/App.tsx` veya `src/index.tsx` içinde bir `useEffect`):

```ts
import { useEffect } from 'react';
import OneSignal from '@onesignal/capacitor-plugin';

function useOneSignal(appId: string) {
  useEffect(() => {
    async function setup() {
      try {
        // 1) SDK başlatma
        await OneSignal.initialize({ appId });

        // 2) Android 13+ için runtime izin iste (kullanıcıya prompt gösterir)
        // iOS yoksa Android’de çağırmak güvenlidir; desteklenmeyen platformda no-op olabilir.
        await OneSignal.Notifications.requestPermission(true);

        // 3) (Opsiyonel) Foreground davranışı: Bildirim geldiğinde uygulama ön planda ise gösterim
        // çoğu durumda varsayılan iyi çalışır. İhtiyaç olursa OneSignal ayarlarından/notificationReceived
        // event’lerinden özelleştirin.

        // 4) (Opsiyonel) Kullanıcıyı login ederek hedefli bildirimler için kimlik bağlama
        // await OneSignal.login('<USER_ID>');

        // 5) (Opsiyonel) Tıklama olaylarını dinleme
        const onClick = (event: any) => {
          // event.notification, event.url vb. alanları kullanabilirsiniz
          // Örn: bildirimdeki deep link’e yönlendirme
          // window.location.href = event.url ?? '/';
        };
        OneSignal.Notifications.addEventListener('click', onClick);

        return () => {
          OneSignal.Notifications.removeEventListener('click', onClick);
        };
      } catch (err) {
        console.error('OneSignal setup error', err);
      }
    }
    setup();
  }, [appId]);
}

export default function App() {
  useOneSignal('your_onesignal_app_id_here');
  return (
    <div>Uygulama</div>
  );
}
```

Notlar:
- Bu proje için OneSignal App ID: `your_onesignal_app_id_here`.
- `requestPermission(true)` Android 13+ için izin prompt’u gösterir. Kullanıcı reddederse daha sonra tekrar sorabilirsiniz.
- `login(userId)` kullanmanız, OneSignal Audience/Segments ile kullanıcı bazlı hedefleme yapmanızı sağlar.

---

### 6) Senkronizasyon, derleme ve çalıştırma
```bash
npx cap sync android
npx cap open android
```
Android Studio açıldıktan sonra cihazda/emdlatörde çalıştırın. İlk açılışta (Android 13+) bildirim izni prompt’u görünür. OneSignal panelinden test bildirimi göndererek cihaz kaydını doğrulayın.

---

### 7) Üretim (release) notları
- Projenizde `release` derlemelerinde `minifyEnabled true` ve `shrinkResources true` aktif. OneSignal 4.x/Capacitor eklentisi ile ek proguard kuralı genellikle gerekmez. Her ihtimale karşı bildirim gelmezse proguard kaynaklı olup olmadığını kontrol edin.
- `google-services.json` dosyasının release ve debug yapılandırmaları için doğru konumda olduğundan emin olun (`android/app`).
- Arka planda bildirimlerin ulaşması cihaz üretici optimizasyonlarından etkilenebilir (özellikle Çin menşeili cihazlar). Gerekirse pil optimizasyonu istisnası/dosyalama ekranı sunmayı değerlendirin.

---

### 8) Sık karşılaşılan sorunlar
- Bildirim gelmiyor:
  - `google-services.json` doğru paket adını içeriyor mu?
  - Android Studio > Logcat’te OneSignal/FCM ile ilgili hata var mı?
  - Cihaz internete bağlı mı ve uygulama sistem tarafından kısıtlanmıyor mu?
  - OneSignal panelinde App ID doğru mu? Firebase bağlantısı tamamlandı mı?
- Android 13’te prompt çıkmıyor:
  - `AndroidManifest.xml` içine `POST_NOTIFICATIONS` iznini eklediniz mi?
  - Uygulama içinde `OneSignal.Notifications.requestPermission(true)` çağrılıyor mu?
- Derleme hatası (google-services):
  - `android/build.gradle` içinde `classpath 'com.google.gms:google-services:4.4.2'` var mı?
  - `android/app/build.gradle` içinde google services eklentisi uygulanıyor mu? Repo’da dosya algılanırsa otomatik uygulanıyor.

---

### 9) Ek API’ler (kısa özet)
- `OneSignal.initialize({ appId })`: SDK başlatma.
- `OneSignal.Notifications.requestPermission(forcePrompt?: boolean)`: Android 13+ için izin isteme.
- `OneSignal.login(externalId: string) / OneSignal.logout()`: Kullanıcı kimliği bağlama/kaldırma.
- `OneSignal.Notifications.addEventListener('click', handler)`: Bildirim tıklama olaylarını dinleme.
- `OneSignal.User.pushSubscription.getId()`: Cihaz/abone kimliği alma (segmentasyon/deeplink amaçlı kullanılabilir).

---

### 10) Hızlı kontrol listesi
- [ ] `@onesignal/capacitor-plugin` kuruldu
- [ ] `google-services.json` `android/app/` içine eklendi
- [ ] `POST_NOTIFICATIONS` izni Manifest’e eklendi
- [ ] Uygulama içinde `initialize` ve `requestPermission` çağrılıyor
- [ ] `npx cap sync android` ve Android Studio’da başarılı derleme
- [ ] OneSignal panelinden test bildirimi başarıyla ulaşıyor

Sorun yaşarsanız OneSignal dokümantasyonundaki Android + Capacitor sayfalarını takip edin ve Logcat çıktılarıyla hatayı daraltın.


