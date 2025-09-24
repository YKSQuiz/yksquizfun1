// Bu dosya AuthContext.tsx'teki useAuth ile çakıştığı için kullanılmıyor
// AuthContext.tsx'teki useAuth hook'u kullanılıyor
// Bu dosya gelecekte kullanılabilir diye korunuyor

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';

/**
 * Firebase kimlik doğrulama durumunu yöneten custom hook
 * @returns Kimlik doğrulama durumu ve kullanıcı bilgileri
 * @deprecated AuthContext.tsx'teki useAuth kullanılıyor
 */
export const useAuthHook = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}; 