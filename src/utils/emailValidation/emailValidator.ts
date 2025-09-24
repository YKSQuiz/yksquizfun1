import validator from 'email-validator';
import disposableDomains from 'disposable-email-domains';
import wildcardDomains from 'disposable-email-domains/wildcard.json';
import { EmailValidationResult, EmailValidationOptions } from './types';

const DEFAULT_OPTIONS: EmailValidationOptions = {
  checkDisposable: true,
  checkDomain: true,
  allowSubdomains: true
};

// Cache için Map kullanıyoruz
const emailCache = new Map<string, { result: EmailValidationResult; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// Rate limiting için
const rateLimiter = new Map<string, number>();
const RATE_LIMIT_DURATION = 1000; // 1 saniye

export const validateEmail = async (
  email: string, 
  options: Partial<EmailValidationOptions> = {}
): Promise<EmailValidationResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  // Input sanitization
  const sanitizedEmail = email.trim().toLowerCase();

  // Boş kontrol
  if (!sanitizedEmail || sanitizedEmail === '') {
    return {
      isValid: false,
      message: 'E-posta adresi gereklidir',
      errors: ['E-posta adresi boş olamaz']
    };
  }

  // Rate limiting kontrolü
  if (!checkRateLimit(sanitizedEmail)) {
    return {
      isValid: false,
      message: 'Çok hızlı kontrol yapıyorsunuz. Lütfen bekleyin.',
      errors: ['Rate limit aşıldı']
    };
  }

  // Cache kontrolü
  const cachedResult = getCachedResult(sanitizedEmail);
  if (cachedResult) {
    return cachedResult;
  }

  // Format kontrolü
  if (!validator.validate(sanitizedEmail)) {
    errors.push('Geçersiz e-posta formatı');
  }

  // Disposable e-mail kontrolü
  if (opts.checkDisposable && errors.length === 0) {
    const domain = sanitizedEmail.split('@')[1];
    if (domain && isDisposableDomain(domain)) {
      errors.push('Geçici e-posta adresleri kabul edilmez');
    }
  }

  // Domain kontrolü
  if (opts.checkDomain && errors.length === 0) {
    const domainValid = await validateDomain(sanitizedEmail);
    if (!domainValid) {
      errors.push('Geçersiz domain adresi');
    }
  }

  const result: EmailValidationResult = {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : undefined,
    errors
  };

  // Sonucu cache'e kaydet
  cacheResult(sanitizedEmail, result);

  // Analytics tracking
  trackEmailValidation(sanitizedEmail, result);

  return result;
};

const isDisposableDomain = (domain: string): boolean => {
  // Tam domain eşleşmesi kontrolü
  if (disposableDomains.includes(domain)) {
    return true;
  }
  
  // Wildcard domain kontrolü
  for (const wildcard of wildcardDomains) {
    const pattern = wildcard.replace('*.', '');
    if (domain.endsWith(pattern)) {
      return true;
    }
  }
  
  return false;
};

const validateDomain = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1];
  
  // Yaygın geçersiz domain'ler
  const invalidDomains = [
    'test.com', 'example.com', 'invalid.com', 'fake.com',
    'temp.com', 'temporary.com', 'throwaway.com', 'demo.com',
    'sample.com', 'dummy.com', 'placeholder.com'
  ];
  
  if (invalidDomains.includes(domain)) {
    return false;
  }

  // DNS kontrolü (opsiyonel - hata durumunda geçerli kabul et)
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
    const data = await response.json();
    return data.Status !== 3; // 3 = NXDOMAIN
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('DNS kontrolü başarısız:', error);
    return true; // Hata durumunda geçerli kabul et
  }
};

const checkRateLimit = (email: string): boolean => {
  const now = Date.now();
  const lastCheck = rateLimiter.get(email) || 0;
  
  if (now - lastCheck < RATE_LIMIT_DURATION) {
    return false;
  }
  
  rateLimiter.set(email, now);
  return true;
};

const getCachedResult = (email: string): EmailValidationResult | null => {
  const cached = emailCache.get(email);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    emailCache.delete(email);
    return null;
  }
  
  return cached.result;
};

const cacheResult = (email: string, result: EmailValidationResult): void => {
  emailCache.set(email, {
    result,
    timestamp: Date.now()
  });
};

const trackEmailValidation = (email: string, result: EmailValidationResult): void => {
  // Analytics tracking - sadece domain bilgisini logla
  const domain = email.split('@')[1];
  // eslint-disable-next-line no-console
  console.log('📊 E-mail validation:', {
    domain,
    isValid: result.isValid,
    errors: result.errors,
    timestamp: new Date().toISOString()
  });
};

// Cache temizleme fonksiyonu (opsiyonel)
export const clearEmailCache = (): void => {
  emailCache.clear();
  rateLimiter.clear();
};

// Cache istatistikleri (debug için)
export const getCacheStats = (): { cacheSize: number; rateLimitSize: number } => {
  return {
    cacheSize: emailCache.size,
    rateLimitSize: rateLimiter.size
  };
};
