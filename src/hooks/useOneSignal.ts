import { useEffect } from 'react';

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
    OneSignal?: any;
  }
}

export function useOneSignal(appId: string) {
  useEffect(() => {
    let isMounted = true;
    let removeClickListener: (() => void) | undefined;

    async function setup() {
      try {
        const os = window.plugins?.OneSignal || window.OneSignal;
        if (!os) {
          console.warn('OneSignal Cordova plugin not available');
          return;
        }

        // Ayrıntılı loglar (debug) - OneSignal Cordova plugin için
        try {
          if (typeof os.setLogLevel === 'function') {
            os.setLogLevel(6, 0); // VERBOSE
          }
          // Cordova plugin için ek log ayarları
          if (typeof os.setRequiresUserPrivacyConsent === 'function') {
            os.setRequiresUserPrivacyConsent(false);
          }
        } catch (e) {
          console.log('[OneSignal] Log ayarları başarısız:', e);
        }

        // Initialize / set app id (OneSignal Cordova plugin için)
        console.log('[OneSignal] App ID ile başlatılıyor:', appId);
        if (typeof os.setAppId === 'function') {
          os.setAppId(appId);
          console.log('[OneSignal] setAppId çağrıldı');
        } else if (typeof os.initialize === 'function') {
          try {
            os.initialize({ appId });
            console.log('[OneSignal] initialize({ appId }) çağrıldı');
          } catch (_) {
            try {
              os.initialize(appId);
              console.log('[OneSignal] initialize(appId) çağrıldı');
            } catch (e) {
              console.error('[OneSignal] Initialize başarısız:', e);
            }
          }
        } else {
          console.error('[OneSignal] setAppId veya initialize metodu bulunamadı');
        }

        // Request notifications permission (Android 13+ / iOS)
        console.log('[OneSignal] Bildirim izni isteniyor...');
        if (os?.Notifications?.requestPermission) {
          const permission = await os.Notifications.requestPermission(true);
          console.log('[OneSignal] requestPermission sonucu:', permission);
        } else if (typeof os.promptForPushNotificationsWithUserResponse === 'function') {
          os.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
            console.log('[OneSignal] promptForPushNotificationsWithUserResponse sonucu:', accepted);
          });
        } else {
          console.warn('[OneSignal] İzin isteme metodu bulunamadı');
        }

        // Click handler (support both styles)
        const onClick = (event: any) => {
          if (!isMounted) return;
          // event.notification / event.url kullanılabilir (versiyona göre değişir)
        };

        if (os?.Notifications?.addEventListener) {
          os.Notifications.addEventListener('click', onClick);
          removeClickListener = () => os.Notifications.removeEventListener('click', onClick);
        } else if (typeof os.setNotificationOpenedHandler === 'function') {
          os.setNotificationOpenedHandler(onClick);
        }

        // Cihaz durumunu logla (userId / pushToken) - daha detaylı
        setTimeout(() => {
          try {
            if (typeof os.getDeviceState === 'function') {
              os.getDeviceState((state: any) => {
                console.log('[OneSignal] deviceState detayı:', {
                  userId: state?.userId,
                  pushToken: state?.pushToken,
                  isSubscribed: state?.isSubscribed,
                  hasNotificationPermission: state?.hasNotificationPermission,
                  isPushDisabled: state?.isPushDisabled,
                  fullState: state
                });
                
                // Eğer abone değilse, manuel abone ol
                if (!state?.isSubscribed) {
                  console.log('[OneSignal] Cihaz abone değil, manuel abone olmaya çalışılıyor...');
                  if (typeof os.promptForPushNotificationsWithUserResponse === 'function') {
                    os.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
                      console.log('[OneSignal] Manuel abone olma sonucu:', accepted);
                    });
                  }
                }
              });
            } else if (os?.User?.pushSubscription?.getId) {
              const id = os.User.pushSubscription.getId();
              console.log('[OneSignal] pushSubscriptionId', id);
            } else {
              console.warn('[OneSignal] getDeviceState metodu bulunamadı');
            }
          } catch (e) {
            console.error('[OneSignal] Cihaz durumu alınamadı:', e);
          }
        }, 2000); // 2 saniye bekle

        // Ek test: 5 saniye sonra tekrar kontrol et
        setTimeout(() => {
          try {
            if (typeof os.getDeviceState === 'function') {
              os.getDeviceState((state: any) => {
                console.log('[OneSignal] 5 saniye sonra deviceState:', {
                  userId: state?.userId,
                  isSubscribed: state?.isSubscribed,
                  hasNotificationPermission: state?.hasNotificationPermission
                });
              });
            }
          } catch (e) {
            console.error('[OneSignal] 5 saniye sonraki kontrol hatası:', e);
          }
        }, 5000);
      } catch (error) {
        console.error('OneSignal initialization failed', error);
      }
    }

    setup();

    return () => {
      isMounted = false;
      if (removeClickListener) removeClickListener();
    };
  }, [appId]);
}


