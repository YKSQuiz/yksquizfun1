import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Sayfa değiştiğinde en üste scroll yap
    window.scrollTo(0, 0);
    
    // Smooth scroll için ek kontrol
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 100);
  }, [pathname]);

  return null;
};

export default ScrollToTop; 