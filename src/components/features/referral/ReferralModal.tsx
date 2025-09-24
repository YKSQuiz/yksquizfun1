import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import './ReferralModal.css';
import { FaWhatsapp, FaTelegramPlane, FaTwitter, FaInstagram } from 'react-icons/fa';

interface SocialButtonProps {
  platform: 'whatsapp' | 'telegram' | 'twitter' | 'instagram';
  shareUrl: string;
  referralCode: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ platform, shareUrl, referralCode }) => {
  const text = `YKS'ye hazırlanırken hem eğlenip hem de öğrenmek ister misin? YKS QUIZ'i indir, bu linkle kaydol ve yarışa başlayalım! ${shareUrl}`;
  
  const urls = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    instagram: `https://www.instagram.com/`, // Instagram için ana sayfaya yönlendir, kullanıcı manuel paylaşım yapabilir
  };

  const icons = {
    whatsapp: <FaWhatsapp />,
    telegram: <FaTelegramPlane />,
    twitter: <FaTwitter />,
    instagram: <FaInstagram />,
  };

  const handleClick = () => {
    if (platform === 'instagram') {
      // Instagram için özel işlem - linki kopyala ve Instagram'a yönlendir
      navigator.clipboard.writeText(text).then(() => {
        alert('Link kopyalandı! Instagram\'da paylaşmak için yapıştırabilirsin.');
        window.open(urls[platform], '_blank');
      }).catch(() => {
        // Fallback: sadece Instagram'a yönlendir
        window.open(urls[platform], '_blank');
      });
    } else {
      window.open(urls[platform], '_blank');
    }
  };

  return (
    <button className={`social-button ${platform}`} onClick={handleClick}>
      {icons[platform]}
    </button>
  );
};


interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [referralLink, setReferralLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Davet istatistikleri
  const currentInvites = user?.referral?.allTimeInvites || 0;
  const remainingInvites = Math.max(0, 3 - currentInvites);
  const hasReachedLimit = currentInvites >= 3;

  useEffect(() => {
    if (user?.referral?.code) {
      const baseUrl = 'https://yksquiz.fun'; // Sabit URL olarak ayarlandı
      setReferralLink(`${baseUrl}/login?mode=register&ref=${user.referral.code}`);
    }
  }, [user]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // 2 saniye sonra mesajı kaldır
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        
        <h2>🚀 Davet Et, Kazan!</h2>
        <p className="modal-subtitle">
          Paylaştığın link ile kayıt olan her arkadaşın için anında 
          <strong> 10.000 Coin</strong> ve <strong>10.000 XP</strong> kazanırsın!
          <br />
                     <span style={{ fontSize: '0.9rem', color: '#888' }}>
             ⚠️ Sadece ilk 3 davet için ödül alabilirsin
           </span>
        </p>

                 {/* Davet İstatistikleri */}
         <div className="invite-stats" style={{ 
           background: 'rgba(0, 0, 0, 0.3)', 
           padding: '15px', 
           borderRadius: '10px', 
           marginBottom: '20px',
           border: '1px solid rgba(255, 255, 255, 0.1)'
         }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
             <div>
               <div style={{ fontSize: '0.9rem', color: '#b0b0b0' }}>Toplam Davet</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00d9ff' }}>{currentInvites}</div>
             </div>
             <div>
               <div style={{ fontSize: '0.9rem', color: '#b0b0b0' }}>Kalan Ödüllü</div>
               <div style={{ 
                 fontSize: '1.5rem', 
                 fontWeight: 'bold', 
                 color: hasReachedLimit ? '#ff6b6b' : '#4ecdc4' 
               }}>
                 {hasReachedLimit ? '0' : remainingInvites}
               </div>
             </div>
           </div>
          {hasReachedLimit && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#ff6b6b', 
              marginTop: '10px',
              textAlign: 'center'
            }}>
              ⚠️ Ödül limitine ulaştın! Yine de davet edebilirsin.
            </div>
          )}
        </div>

        <div className="link-container">
          <input type="text" value={referralLink} readOnly />
          <button onClick={copyToClipboard} className={copySuccess ? 'success' : ''}>
            {copySuccess ? 'Kopyalandı!' : 'Kopyala'}
          </button>
        </div>

        <div className="social-sharing">
          <p>Veya direkt paylaş:</p>
          <div className="social-buttons-container">
            {user?.referral?.code && referralLink && (
              <>
                <SocialButton platform="whatsapp" shareUrl={referralLink} referralCode={user.referral.code} />
                <SocialButton platform="telegram" shareUrl={referralLink} referralCode={user.referral.code} />
                <SocialButton platform="twitter" shareUrl={referralLink} referralCode={user.referral.code} />
                <SocialButton platform="instagram" shareUrl={referralLink} referralCode={user.referral.code} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralModal;
