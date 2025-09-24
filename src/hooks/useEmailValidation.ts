import { useState, useCallback, useRef } from 'react';
import { validateEmail, EmailValidationResult } from '../utils/emailValidation';

export const useEmailValidation = () => {
  const [validation, setValidation] = useState<EmailValidationResult>({
    isValid: true,
    errors: []
  });
  const [isChecking, setIsChecking] = useState(false);
  
  // Debounce için timeout ref'i
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // eslint-disable-next-line no-console
      console.error('E-mail doğrulama hatası:', error);
      setValidation({
        isValid: false,
        message: 'E-posta doğrulama hatası',
        errors: ['Doğrulama sırasında hata oluştu']
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Debounced e-mail kontrolü
  const debouncedCheckEmail = useCallback((email: string) => {
    // Önceki timeout'u temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Yeni timeout ayarla
    timeoutRef.current = setTimeout(() => {
      checkEmail(email);
    }, 500); // 500ms debounce
  }, [checkEmail]);

  // Component unmount olduğunda timeout'u temizle
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    validation,
    isChecking,
    checkEmail,
    debouncedCheckEmail,
    clearTimeout: clearTimeoutRef
  };
};
