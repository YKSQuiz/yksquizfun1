import { useState, useEffect } from 'react';

/**
 * Değer değişikliklerini geciktiren custom hook
 * @param value Geciktirilecek değer
 * @param delay Gecikme süresi (ms)
 * @returns Geciktirilmiş değer
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}; 