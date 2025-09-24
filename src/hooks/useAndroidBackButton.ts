import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sadece mobil ortamda çalıştır
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isCapacitor = (window as any).Capacitor !== undefined;
    
    if (!isMobile && !isCapacitor) {
      return; // Web ortamında çalıştırma
    }

    const handleBackButton = () => {
      // Ana sayfa kontrolü
      if (location.pathname === '/') {
        // Ana sayfadaysa uygulamayı kapat
        if (isCapacitor) {
          import('@capacitor/app').then(({ App }) => {
            App.exitApp();
          });
        }
        return;
      }

      // Login sayfasındaysa ana sayfaya git
      if (location.pathname === '/login') {
        navigate('/');
        return;
      }

      // Diğer sayfalarda geri git
      navigate(-1);
    };

    // Global Android geri tuşu handler'ı ekle
    (window as any).handleAndroidBackButton = handleBackButton;

    // Android geri tuşu listener'ı ekle (sadece Capacitor ortamında)
    if (isCapacitor) {
      let backButtonListener: any = null;
      
      import('@capacitor/app').then(({ App }) => {
        App.addListener('backButton', handleBackButton).then((listener) => {
          backButtonListener = listener;
        });
      });

      return () => {
        // Listener'ı temizle
        if (backButtonListener) {
          backButtonListener.remove();
        }
        // Global handler'ı temizle
        delete (window as any).handleAndroidBackButton;
      };
    }

    return () => {
      // Global handler'ı temizle
      delete (window as any).handleAndroidBackButton;
    };
  }, [navigate, location.pathname]);
};
