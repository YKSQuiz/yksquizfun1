import { useState, useEffect, useRef, useCallback } from 'react';

export type SoundType = 
  | 'correct' 
  | 'incorrect' 
  | 'start' 
  | 'success' 
  | 'fail' 
  | 'joker' 
  | 'click' 
  | 'notification';

interface SoundSettings {
  enabled: boolean;
  lastUpdated: number;
}

interface SoundManager {
  playSound: (soundName: SoundType) => void;
  toggleSound: () => void;
  isEnabled: boolean;
  preloadSounds: () => Promise<void>;
  checkSoundStatus: () => void; // Test fonksiyonu
}

const STORAGE_KEY = 'quizSoundSettings';
const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  lastUpdated: Date.now()
};

const SOUND_FILES: Record<SoundType, string> = {
  correct: '/sounds/correct.mp3',
  incorrect: '/sounds/incorrect.mp3',
  start: '/sounds/start.mp3',
  success: '/sounds/success.mp3',
  fail: '/sounds/fail.mp3',
  joker: '/sounds/joker.mp3',
  click: '/sounds/click.mp3',
  notification: '/sounds/notification.mp3'
};

export const useSoundManager = (): SoundManager => {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const audioElements = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const isPreloading = useRef(false);

  // LocalStorage'dan ayarları yükle
  const loadSettings = useCallback((): SoundSettings => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sadece geçerli ayarları kabul et
        const validSettings = {
          ...DEFAULT_SETTINGS,
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
          lastUpdated: parsed.lastUpdated || Date.now()
        };
        console.log('Ses ayarları yüklendi:', validSettings);
        return validSettings;
      }
    } catch (error) {
      console.warn('Ses ayarları yüklenirken hata:', error);
    }
    console.log('Varsayılan ses ayarları kullanılıyor:', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }, []);

  // Ayarları localStorage'a kaydet
  const saveSettings = useCallback((newSettings: SoundSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...newSettings,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.warn('Ses ayarları kaydedilirken hata:', error);
    }
  }, []);

  // Ses dosyalarını ön yükle
  const preloadSounds = useCallback(async (): Promise<void> => {
    if (isPreloading.current) return;
    isPreloading.current = true;

    try {
      const promises = Object.entries(SOUND_FILES).map(async ([soundType, filePath]) => {
        const audio = new Audio(filePath);
        audio.preload = 'auto';
        
        // Ses seviyesini güncel ayarlara göre ayarla
        audio.volume = settings.enabled ? 1.0 : 0.0;
        
        // Ses dosyasını yükle
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          audio.load();
        });

        audioElements.current.set(soundType as SoundType, audio);
      });

      await Promise.allSettled(promises);
      setIsInitialized(true);
      console.log(`Ses dosyaları yüklendi. Ses durumu: ${settings.enabled ? 'açık' : 'kapalı'}`);
    } catch (error) {
      console.warn('Ses dosyaları yüklenirken hata:', error);
      // Hata durumunda sessiz moda geç
      setSettings(prev => ({ ...prev, enabled: false }));
    } finally {
      isPreloading.current = false;
    }
  }, [settings.enabled]);

  // Ses çal
  const playSound = useCallback((soundName: SoundType) => {
    // Ses durumunu localStorage'dan anlık kontrol et
    let currentEnabled = settings.enabled;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        currentEnabled = typeof parsed.enabled === 'boolean' ? parsed.enabled : false;
      }
    } catch (error) {
      currentEnabled = false;
    }

    // Ses kapalıysa hiçbir şey yapma - en sıkı kontrol
    if (!currentEnabled) {
      console.log(`${soundName} sesi çalınmadı - ses kapalı (localStorage kontrolü)`);
      return;
    }
    
    // Ses dosyaları henüz yüklenmemişse çalma
    if (!isInitialized) {
      console.log(`${soundName} sesi çalınmadı - ses dosyaları henüz yüklenmedi`);
      return;
    }

    // Ses elementleri yoksa çalma
    if (audioElements.current.size === 0) {
      console.log(`${soundName} sesi çalınmadı - ses elementleri yok`);
      return;
    }

    try {
      const audio = audioElements.current.get(soundName);
      if (audio) {
        // Ses dosyasını baştan başlat
        audio.currentTime = 0;
        
        // Ses seviyesini kontrol et (ses kapalıysa 0 yap)
        audio.volume = currentEnabled ? 1.0 : 0.0;
        
        // Debug için ses çalma bilgisini logla
        console.log(`${soundName} sesi çalınıyor (ses durumu: ${currentEnabled ? 'açık' : 'kapalı'})`);
        
        // Tarayıcı politikalarına uygun şekilde çal
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn('Ses çalınırken hata:', error);
          });
        }
      } else {
        console.log(`${soundName} sesi çalınmadı - ses elementi bulunamadı`);
      }
    } catch (error) {
      console.warn('Ses çalınırken hata:', error);
    }
  }, [settings.enabled, isInitialized]);

  // Ses açma/kapama
  const toggleSound = useCallback(() => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    console.log(`Ses durumu değiştirildi: ${newSettings.enabled ? 'Açık' : 'Kapalı'}`);
    
    // Anlık olarak ses durumunu güncelle
    if (isInitialized) {
      if (newSettings.enabled) {
        // Ses açıldıysa ses dosyalarını yükle ve volume'u 1 yap
        if (!isPreloading.current) {
          preloadSounds();
        }
        audioElements.current.forEach(audio => {
          audio.volume = 1.0;
        });
        console.log('Ses açıldı - volume 1 yapıldı');
      } else {
        // Ses kapatıldıysa tüm sesleri durdur ve volume'u 0 yap
        audioElements.current.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.0;
        });
        console.log('Ses kapatıldı - tüm sesler durduruldu ve volume 0 yapıldı');
      }
    }
    
    // State güncellemesini bekle ve tekrar kontrol et
    setTimeout(() => {
      const currentStored = localStorage.getItem(STORAGE_KEY);
      if (currentStored) {
        const parsed = JSON.parse(currentStored);
        console.log(`localStorage güncel durum: ${parsed.enabled ? 'Açık' : 'Kapalı'}`);
      }
    }, 100);
  }, [settings, saveSettings, isInitialized, preloadSounds]);

  // İlk yükleme
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
  }, [loadSettings]);

  // Ses dosyalarını ön yükle
  useEffect(() => {
    if (settings.enabled && !isInitialized && !isPreloading.current) {
      preloadSounds();
    }
  }, [settings.enabled, isInitialized, preloadSounds]);

  // Ses durumu değiştiğinde ses elementlerini güncelle
  useEffect(() => {
    if (isInitialized) {
      if (!settings.enabled) {
        // Ses kapalıysa tüm sesleri durdur ve volume'u 0 yap
        audioElements.current.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.0;
        });
        console.log('Ses durumu değişti: Tüm sesler durduruldu ve volume 0 yapıldı');
      } else {
        // Ses açıldıysa volume'u 1 yap
        audioElements.current.forEach(audio => {
          audio.volume = 1.0;
        });
        console.log('Ses durumu değişti: Ses açıldı, volume 1 yapıldı');
      }
    }
  }, [settings.enabled, isInitialized]);

  // localStorage değişikliklerini dinle
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const newSettings = e.newValue ? JSON.parse(e.newValue) : DEFAULT_SETTINGS;
          setSettings(newSettings);
          console.log('localStorage değişikliği algılandı:', newSettings);
        } catch (error) {
          console.warn('localStorage değişikliği okunamadı:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sekme değişiminde sesleri duraklat
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioElements.current.forEach(audio => {
          audio.pause();
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    playSound,
    toggleSound,
    isEnabled: settings.enabled,
    preloadSounds,
    checkSoundStatus: () => {
      console.log('=== SES DURUMU KONTROLÜ ===');
      console.log('State enabled:', settings.enabled);
      console.log('isInitialized:', isInitialized);
      console.log('Audio elements count:', audioElements.current.size);
      
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('localStorage enabled:', parsed.enabled);
        } else {
          console.log('localStorage: veri yok');
        }
      } catch (error) {
        console.log('localStorage okuma hatası:', error);
      }
      
      console.log('========================');
    }
  };
};
