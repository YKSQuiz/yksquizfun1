# E-mail Doğrulama Sistemi - YKS Quiz

## 📋 Genel Bakış

Bu dokümantasyon, YKS Quiz uygulamasında kullanıcıların gerçek e-mail adresleri ile kayıt olmasını sağlamak için geliştirilecek e-mail doğrulama sistemini açıklar.

### 🎯 Hedefler
- ✅ Kullanıcıları e-mail verification sürecine sokmadan doğrulama
- ✅ Gerçek olmayan e-mail adreslerini engelleme
- ✅ Kullanıcı deneyimini bozmadan güvenlik sağlama
- ✅ Performans odaklı çözüm

### ❌ Yapılmayacaklar
- E-mail verification linki gönderme
- Kullanıcıdan e-mail onayı isteme
- Karmaşık doğrulama süreçleri

---

## 🛠️ Teknik Çözüm

### 1. Kütüphane Seçimi

**Önerilen: `email-validator` + `disposable-email-domains`**

```bash
npm install email-validator disposable-email-domains
```

**Alternatifler:**
- `validator` (daha kapsamlı)
- `yup` (form validation ile birlikte)

### 2. Doğrulama Katmanları

#### Katman 1: Format Doğrulama
```typescript
import validator from 'email-validator';

const validateEmailFormat = (email: string): boolean => {
  return validator.validate(email);
};
```

#### Katman 2: Disposable E-mail Kontrolü
```typescript
import { isDisposable } from 'disposable-email-domains';

const checkDisposableEmail = (email: string): boolean => {
  const domain = email.split('@')[1];
  return !isDisposable(domain);
};
```

#### Katman 3: Domain Geçerlilik Kontrolü
```typescript
const validateDomain = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1];
  
  // Yaygın geçersiz domain'leri kontrol et
  const invalidDomains = ['test.com', 'example.com', 'invalid.com'];
  if (invalidDomains.includes(domain)) {
    return false;
  }
  
  // DNS kontrolü (opsiyonel)
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
    const data = await response.json();
    return data.Status !== 3; // 3 = NXDOMAIN
  } catch {
    return true; // Hata durumunda geçerli kabul et
  }
};
```

---

## 📁 Dosya Yapısı

```
src/
├── utils/
│   ├── emailValidation/
│   │   ├── index.ts          # Ana export
│   │   ├── emailValidator.ts # Doğrulama fonksiyonları
│   │   ├── domainChecker.ts  # Domain kontrolü
│   │   └── types.ts          # TypeScript tipleri
│   └── constants/
│       └── emailValidation.ts # Sabitler
├── hooks/
│   └── useEmailValidation.ts # Custom hook
└── components/
    └── features/
        └── auth/
            └── Login.tsx     # Güncellenecek
```

---

## 🔧 Implementasyon Adımları

### Adım 1: Kütüphaneleri Yükle
```bash
npm install email-validator disposable-email-domains
npm install --save-dev @types/email-validator
```

### Adım 2: E-mail Doğrulama Utils Oluştur

#### `src/utils/emailValidation/types.ts`
```typescript
export interface EmailValidationResult {
  isValid: boolean;
  message?: string;
  errors: string[];
}

export interface EmailValidationOptions {
  checkDisposable: boolean;
  checkDomain: boolean;
  allowSubdomains: boolean;
}
```

#### `src/utils/emailValidation/emailValidator.ts`
```typescript
import validator from 'email-validator';
import { isDisposable } from 'disposable-email-domains';
import { EmailValidationResult, EmailValidationOptions } from './types';

const DEFAULT_OPTIONS: EmailValidationOptions = {
  checkDisposable: true,
  checkDomain: true,
  allowSubdomains: true
};

export const validateEmail = async (
  email: string, 
  options: Partial<EmailValidationOptions> = {}
): Promise<EmailValidationResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  // Boş kontrol
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      message: 'E-posta adresi gereklidir',
      errors: ['E-posta adresi boş olamaz']
    };
  }

  // Format kontrolü
  if (!validator.validate(email)) {
    errors.push('Geçersiz e-posta formatı');
  }

  // Disposable e-mail kontrolü
  if (opts.checkDisposable) {
    const domain = email.split('@')[1];
    if (domain && isDisposable(domain)) {
      errors.push('Geçici e-posta adresleri kabul edilmez');
    }
  }

  // Domain kontrolü
  if (opts.checkDomain && errors.length === 0) {
    const domainValid = await validateDomain(email);
    if (!domainValid) {
      errors.push('Geçersiz domain adresi');
    }
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : undefined,
    errors
  };
};

const validateDomain = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1];
  
  // Yaygın geçersiz domain'ler
  const invalidDomains = [
    'test.com', 'example.com', 'invalid.com', 'fake.com',
    'temp.com', 'temporary.com', 'throwaway.com'
  ];
  
  if (invalidDomains.includes(domain)) {
    return false;
  }

  // DNS kontrolü (opsiyonel)
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
    const data = await response.json();
    return data.Status !== 3; // 3 = NXDOMAIN
  } catch {
    return true; // Hata durumunda geçerli kabul et
  }
};
```

#### `src/utils/emailValidation/index.ts`
```typescript
export * from './emailValidator';
export * from './types';
```

### Adım 3: Custom Hook Oluştur

#### `src/hooks/useEmailValidation.ts`
```typescript
import { useState, useCallback } from 'react';
import { validateEmail, EmailValidationResult } from '../utils/emailValidation';

export const useEmailValidation = () => {
  const [validation, setValidation] = useState<EmailValidationResult>({
    isValid: true,
    errors: []
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkEmail = useCallback(async (email: string) => {
    if (!email) {
      setValidation({ isValid: true, errors: [] });
      return;
    }

    setIsChecking(true);
    try {
      const result = await validateEmail(email);
      setValidation(result);
    } catch (error) {
      setValidation({
        isValid: false,
        message: 'E-posta doğrulama hatası',
        errors: ['Doğrulama sırasında hata oluştu']
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    validation,
    isChecking,
    checkEmail
  };
};
```

### Adım 4: Login Component'ini Güncelle

#### `src/components/features/auth/Login.tsx`
```typescript
import { useEmailValidation } from '../../../hooks/useEmailValidation';

const Login: React.FC = () => {
  // ... existing state ...
  const { validation, isChecking, checkEmail } = useEmailValidation();

  const handleEmailChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setTotalSessionTime(null);
    handleError('');

    // E-mail doğrulama
    await checkEmail(value);

    // Session time kontrolü
    if (value && value.includes('@')) {
      // ... existing session time check code ...
    }
  }, [handleError, handleLoading, checkEmail]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    handleError('');
    handleLoading(true);
    
    // E-mail doğrulama kontrolü
    if (registerMode && !validation.isValid) {
      handleError(validation.message || 'Geçersiz e-posta adresi');
      handleLoading(false);
      return;
    }

    // ... existing submit logic ...
  }, [registerMode, validation, /* ... other dependencies ... */]);

  return (
    // ... existing JSX ...
    <div className="auth-form-group">
      <label htmlFor="email">E-posta</label>
      <input
        type="email"
        id="email"
        value={email}
        onChange={handleEmailChange}
        placeholder="ornek@email.com"
        required
        className={`${!validation.isValid ? 'invalid' : ''} ${isChecking ? 'checking' : ''}`}
      />
      {isChecking && (
        <div className="email-checking">
          <span>✓</span> Kontrol ediliyor...
        </div>
      )}
      {!validation.isValid && validation.message && (
        <div className="email-error">
          {validation.message}
        </div>
      )}
    </div>
    // ... rest of JSX ...
  );
};
```

### Adım 5: CSS Stilleri Ekle

#### `src/styles/components/features/auth.css`
```css
.auth-form-group input.invalid {
  border-color: #ff4444;
  box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.2);
}

.auth-form-group input.checking {
  border-color: #ffaa00;
  box-shadow: 0 0 0 2px rgba(255, 170, 0, 0.2);
}

.email-checking {
  font-size: 12px;
  color: #ffaa00;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.email-error {
  font-size: 12px;
  color: #ff4444;
  margin-top: 4px;
}

.email-success {
  font-size: 12px;
  color: #00aa00;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

## 🧪 Test Senaryoları

### Geçerli E-mail'ler
- `user@gmail.com`
- `test@yahoo.com`
- `info@company.org`
- `admin@domain.co.uk`

### Geçersiz E-mail'ler
- `user@10minutemail.com` (disposable)
- `test@temp-mail.org` (disposable)
- `invalid@test.com` (geçersiz domain)
- `user@example.com` (test domain)

### Format Hataları
- `user@` (eksik domain)
- `@domain.com` (eksik kullanıcı adı)
- `user.domain.com` (@ yok)
- `user@@domain.com` (çift @)

---

## ⚡ Performans Optimizasyonları

### 1. Debouncing
```typescript
import { debounce } from 'lodash';

const debouncedEmailCheck = debounce(checkEmail, 500);
```

### 2. Caching
```typescript
const emailCache = new Map<string, EmailValidationResult>();

const checkEmailWithCache = async (email: string) => {
  if (emailCache.has(email)) {
    return emailCache.get(email)!;
  }
  
  const result = await validateEmail(email);
  emailCache.set(email, result);
  return result;
};
```

### 3. Lazy Loading
```typescript
// Sadece kayıt modunda e-mail doğrulama yap
const shouldValidateEmail = registerMode && email.length > 0;
```

---

## 🔒 Güvenlik Önlemleri

### 1. Rate Limiting
```typescript
const rateLimiter = new Map<string, number>();

const checkRateLimit = (email: string): boolean => {
  const now = Date.now();
  const lastCheck = rateLimiter.get(email) || 0;
  
  if (now - lastCheck < 1000) { // 1 saniye
    return false;
  }
  
  rateLimiter.set(email, now);
  return true;
};
```

### 2. Input Sanitization
```typescript
const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};
```

---

## 📊 Monitoring ve Analytics

### 1. Validation Metrics
```typescript
const trackEmailValidation = (email: string, result: EmailValidationResult) => {
  // Analytics tracking
  console.log('📊 E-mail validation:', {
    email: email.split('@')[1], // Domain only
    isValid: result.isValid,
    errors: result.errors,
    timestamp: new Date().toISOString()
  });
};
```

### 2. Error Tracking
```typescript
const trackValidationError = (error: Error, email: string) => {
  console.error('❌ E-mail validation error:', {
    error: error.message,
    email: email.split('@')[1],
    stack: error.stack
  });
};
```

---

## 🚀 Deployment Checklist

- [ ] Kütüphaneler yüklendi
- [ ] TypeScript tipleri eklendi
- [ ] Utils dosyaları oluşturuldu
- [ ] Custom hook implementasyonu
- [ ] Login component güncellendi
- [ ] CSS stilleri eklendi
- [ ] Test senaryoları kontrol edildi
- [ ] Performance optimizasyonları
- [ ] Error handling
- [ ] Analytics tracking

---

## 📝 Notlar

1. **Kullanıcı Deneyimi**: Doğrulama sırasında kullanıcıyı bloklamayın
2. **Fallback**: Doğrulama başarısız olursa kullanıcıya bilgi verin
3. **Accessibility**: Screen reader desteği ekleyin
4. **Mobile**: Mobil cihazlarda performansı test edin
5. **Offline**: İnternet bağlantısı olmadığında davranışı belirleyin

---

## 🔄 Güncelleme Geçmişi

- **v1.0**: İlk implementasyon
- **v1.1**: Performance optimizasyonları
- **v1.2**: Error handling iyileştirmeleri
- **v1.3**: Analytics tracking eklendi

---

Bu dokümantasyon, e-mail doğrulama sisteminin tam implementasyonu için gerekli tüm bilgileri içerir. Her adımı sırasıyla takip ederek güvenli ve kullanıcı dostu bir doğrulama sistemi oluşturabilirsiniz.
