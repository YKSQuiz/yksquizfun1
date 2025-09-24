import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { MarketItem } from '../../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { GradientBackground, BackButton } from '../../common/ui';
import './Market.css';

// Sabit değerler
const CONSTANTS = {
  ENERGY_REFILL_PRICE: 100,
  MAX_JOKER_COUNT: 3,
  MESSAGE_TIMEOUT: 3000,
  ENERGY_LIMIT_BASE: 100,
  ENERGY_LIMIT_INCREMENT: 5,
  ENERGY_LIMIT_MAX_LEVEL: 30,
  ENERGY_SPEED_BASE: 300,
  ENERGY_SPEED_DECREMENT: 10,
  ENERGY_SPEED_MAX_LEVEL: 20,
  UPGRADE_BASE_PRICE: 1000,
  UPGRADE_PRICE_INCREMENT: 500
} as const;

// Joker türleri
const JOKER_TYPES = {
  eliminate: { name: '%50 Joker Hakkı', icon: '➗' },
  extraTime: { name: 'Ekstra Süre', icon: '⏰' },
  doubleAnswer: { name: 'Çift Cevap', icon: '2️⃣' },
  autoCorrect: { name: 'Otomatik Doğru', icon: '✅' }
} as const;

// Enerji Upgrade Interface
interface EnergyUpgrade {
  level: number;
  value: number;
  price: number;
  isCompleted: boolean;
  isAvailable: boolean;
  unit: string;
}

// Onay Dialog Bileşeni
const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  upgrade: EnergyUpgrade | null;
  userCoins: number;
}> = ({ isOpen, onClose, onConfirm, upgrade, userCoins }) => {
  if (!isOpen || !upgrade) return null;

  const isSufficient = userCoins >= upgrade.price;

  return (
    <div className="confirm-dialog-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon">⚡</span>
          <h3>Satın Alma Onayı</h3>
        </div>
        
        <div className="confirm-dialog-content">
          <p>Bu geliştirmeyi satın almak istediğinizden emin misiniz?</p>
          
          <div className="confirm-dialog-details">
            <div className="detail-item">
              <span className="detail-label">Yeni Değer:</span>
              <span className="detail-value">{upgrade.value}{upgrade.unit}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Fiyat:</span>
              <span className="detail-value">{upgrade.price} 🪙</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Mevcut Coin:</span>
              <span className="detail-value">{userCoins} 🪙</span>
            </div>
          </div>
          
          <div className="confirm-dialog-balance">
            <span className={`balance-status ${isSufficient ? 'sufficient' : 'insufficient'}`}>
              {isSufficient ? '✅ Yeterli Bakiye' : '❌ Yetersiz Bakiye'}
            </span>
          </div>
        </div>
        
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" onClick={onClose}>
            İptal
          </button>
          <button 
            className={`confirm-dialog-confirm ${isSufficient ? 'available' : 'disabled'}`}
            onClick={isSufficient ? onConfirm : undefined}
            disabled={!isSufficient}
          >
            Satın Al
          </button>
        </div>
      </div>
    </div>
  );
};

// Segmentli Progress Bar Bileşeni
const SegmentedProgressBar: React.FC<{
  upgrades: EnergyUpgrade[];
  currentValue: number;
  maxValue: number;
  onUpgrade: (upgrade: EnergyUpgrade) => void;
  title: string;
  subtitle: string;
  unit: string;
  userCoins: number;
  purchaseLoading: string | null;
}> = ({ upgrades, currentValue, maxValue, onUpgrade, title, subtitle, unit, userCoins, purchaseLoading }) => {
  const minValue = upgrades[0]?.value || 0;
  const progress = Math.min(((currentValue - minValue) / (maxValue - minValue)) * 100, 100);
  
  // Bir sonraki satın alınabilir upgrade'i bul
  const nextAvailableUpgrade = upgrades.find(upgrade => upgrade.isAvailable);
  
  // Buton durumunu belirle
  const isButtonDisabled = !nextAvailableUpgrade || (userCoins < (nextAvailableUpgrade?.price || 0));
  const isLoading = purchaseLoading === `upgrade_${nextAvailableUpgrade?.level}`;

  return (
    <div className="energy-upgrade-card">
      <div className="energy-upgrade-header">
        <div className="energy-upgrade-icon">⚡</div>
        <div className="energy-upgrade-info">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      
      <div className="segmented-progress-container">
        <div className="segmented-progress-bar">
          {upgrades.map((upgrade) => (
            <div
              key={upgrade.level}
              className={`progress-segment ${
                upgrade.isCompleted ? 'completed' : 
                upgrade.isAvailable ? 'available' : 'locked'
              }`}
              onClick={() => upgrade.isAvailable && onUpgrade(upgrade)}
              title={upgrade.isAvailable ? `${upgrade.value}${unit} - ${upgrade.price} coin` : `${upgrade.value}${unit} - Kilitli`}
            >
              {!upgrade.isAvailable && !upgrade.isCompleted && (
                <div className="segment-lock-icon">🔒</div>
              )}
              <div className="segment-value">
                {upgrade.value}{unit}
              </div>
            </div>
          ))}
          <div className="progress-percentage">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
      
      <div className="energy-upgrade-stats">
        <div className="energy-upgrade-stats-left">
          <div className="current-value">
            <span className="value-label">Mevcut:</span>
            <span className="value-number">{currentValue}{unit}</span>
          </div>
          <div className="max-value">
            <span className="value-label">Maksimum:</span>
            <span className="value-number">{maxValue}{unit}</span>
          </div>
        </div>
        
        {nextAvailableUpgrade && (
          <button
            onClick={() => !isButtonDisabled && onUpgrade(nextAvailableUpgrade)}
            disabled={isButtonDisabled || isLoading}
            className={`energy-upgrade-purchase-btn ${
              isLoading ? 'loading' : 
              isButtonDisabled ? 'disabled' : ''
            }`}
          >
            <span className="btn-icon">⚡</span>
            <span className="btn-text">
              {isLoading ? 'Yükleniyor...' : 
               isButtonDisabled ? 'Yetersiz Coin' : 
               `${nextAvailableUpgrade.value}${unit} - ${nextAvailableUpgrade.price}🪙`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

// Joker Status Item Bileşeni
const JokerStatusItem: React.FC<{
  type: keyof typeof JOKER_TYPES;
  count: number;
}> = ({ type, count }) => {
  const jokerInfo = JOKER_TYPES[type];
  
  return (
    <div className="joker-status-item">
      <span className="joker-status-icon">{jokerInfo.icon}</span>
      <div className="joker-status-info">
        <span className="joker-status-name">{jokerInfo.name}</span>
        <span className="joker-status-count">{Math.min(count, CONSTANTS.MAX_JOKER_COUNT)}/{CONSTANTS.MAX_JOKER_COUNT}</span>
      </div>
    </div>
  );
};

const Market: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'joker' | 'energy'>('joker');
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    upgrade: EnergyUpgrade | null;
  }>({ isOpen: false, upgrade: null });

  // Tab değiştirme fonksiyonları - performans optimizasyonu
  const handleJokerTab = useCallback(() => {
    if (activeTab !== 'joker') {
      setActiveTab('joker');
    }
  }, [activeTab]);
  
  const handleEnergyTab = useCallback(() => {
    if (activeTab !== 'energy') {
      setActiveTab('energy');
    }
  }, [activeTab]);

  // Enerji Limiti Upgrade'leri
  const energyLimitUpgrades = useMemo(() => {
    const upgrades: EnergyUpgrade[] = [];
    const currentLimit = user?.energyLimit || CONSTANTS.ENERGY_LIMIT_BASE;
    
    for (let level = 1; level <= CONSTANTS.ENERGY_LIMIT_MAX_LEVEL; level++) {
      const value = CONSTANTS.ENERGY_LIMIT_BASE + ((level - 1) * CONSTANTS.ENERGY_LIMIT_INCREMENT);
      const price = CONSTANTS.UPGRADE_BASE_PRICE + ((level - 1) * CONSTANTS.UPGRADE_PRICE_INCREMENT);
      const isCompleted = currentLimit >= value;
      const isAvailable = currentLimit >= (value - CONSTANTS.ENERGY_LIMIT_INCREMENT) && !isCompleted;
      
      upgrades.push({
        level,
        value,
        price,
        isCompleted,
        isAvailable,
        unit: ''
      });
    }
    return upgrades;
  }, [user?.energyLimit]);

  // Enerji Hızı Upgrade'leri
  const energySpeedUpgrades = useMemo(() => {
    const upgrades: EnergyUpgrade[] = [];
    const currentSpeed = user?.energyRegenSpeed || CONSTANTS.ENERGY_SPEED_BASE;
    
    for (let level = 1; level <= CONSTANTS.ENERGY_SPEED_MAX_LEVEL; level++) {
      const value = CONSTANTS.ENERGY_SPEED_BASE - ((level - 1) * CONSTANTS.ENERGY_SPEED_DECREMENT);
      const price = CONSTANTS.UPGRADE_BASE_PRICE + ((level - 1) * CONSTANTS.UPGRADE_PRICE_INCREMENT);
      const isCompleted = currentSpeed <= value;
      const isAvailable = currentSpeed === (value + CONSTANTS.ENERGY_SPEED_DECREMENT) && !isCompleted;
      
      upgrades.push({
        level,
        value,
        price,
        isCompleted,
        isAvailable,
        unit: 's'
      });
    }
    return upgrades;
  }, [user?.energyRegenSpeed]);

  // Joker Market ürünleri
  const jokerItems = useMemo((): MarketItem[] => [
    {
      id: 'eliminate',
      name: JOKER_TYPES.eliminate.name,
      description: 'Yanlış cevaplardan rastgele 2 tanesini siler',
      price: 50,
      category: 'joker',
      type: 'single',
      icon: JOKER_TYPES.eliminate.icon,
      isAvailable: true
    },
    {
      id: 'extraTime',
      name: JOKER_TYPES.extraTime.name,
      description: 'Quiz süresini 60 saniye arttırır',
      price: 75,
      category: 'joker',
      type: 'single',
      icon: JOKER_TYPES.extraTime.icon,
      isAvailable: true
    },
    {
      id: 'doubleAnswer',
      name: JOKER_TYPES.doubleAnswer.name,
      description: 'Doğru cevabı bulmak için 2 defa deneme hakkı verir',
      price: 100,
      category: 'joker',
      type: 'single',
      icon: JOKER_TYPES.doubleAnswer.icon,
      isAvailable: true
    },
    {
      id: 'autoCorrect',
      name: JOKER_TYPES.autoCorrect.name,
      description: 'Otomatik olarak doğru cevabı seçer ve soruyu çözer',
      price: 150,
      category: 'joker',
      type: 'single',
      icon: JOKER_TYPES.autoCorrect.icon,
      isAvailable: true
    },
    {
      id: 'refill_all_jokers',
      name: 'Joker Haklarını Yenile',
      description: 'Tüm Jokerleri 3\'er adet yapar',
      price: 300,
      category: 'joker',
      type: 'refill',
      icon: '🔄',
      isAvailable: true
    }
  ], []);

  // Ortak satın alma fonksiyonu
  const handlePurchase = useCallback(async (
    price: number,
    loadingId: string,
    successMessage: string,
    errorMessage: string,
    updateFunction: () => Promise<void>
  ) => {
    if (!user) return;
    
    setPurchaseLoading(loadingId);
    setPurchaseMessage(null);

    try {
      if ((user.coins || 0) < price) {
        setPurchaseMessage(`Yetersiz coin! ${errorMessage}`);
        return;
      }

      await updateFunction();
      setPurchaseMessage(`✅ ${successMessage}`);
      setTimeout(() => setPurchaseMessage(null), CONSTANTS.MESSAGE_TIMEOUT);

    } catch (error) {
      console.error('Satın alma hatası:', error);
      setPurchaseMessage('❌ Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setPurchaseLoading(null);
    }
  }, [user]);

  // Enerji upgrade fonksiyonu
  const handleEnergyUpgrade = useCallback((upgrade: EnergyUpgrade) => {
    setConfirmDialog({ isOpen: true, upgrade });
  }, []);

  const handleConfirmUpgrade = useCallback(async () => {
    if (!confirmDialog.upgrade || !user) return;
    
    setConfirmDialog({ isOpen: false, upgrade: null });
    
    await handlePurchase(
      confirmDialog.upgrade.price,
      `upgrade_${confirmDialog.upgrade.level}`,
      'Satın alma başarılı!',
      'Bu geliştirmeyi satın almak için daha fazla coin gerekli.',
      async () => {
        const userRef = doc(db, 'users', user.id);
        const updates: any = {
          coins: increment(-confirmDialog.upgrade!.price)
        };

        if (confirmDialog.upgrade!.unit === '') {
          updates.energyLimit = confirmDialog.upgrade!.value;
        } else {
          updates.energyRegenSpeed = confirmDialog.upgrade!.value;
        }

        await updateDoc(userRef, updates);
        try {
          // Leaderboard güncellemesi
          await updateDoc(userRef, {
            'leaderboard.updatedAt': new Date().toISOString()
          });
        } catch {}

        const updatedUser = { ...user };
        updatedUser.coins = (user.coins || 0) - confirmDialog.upgrade!.price;

        if (confirmDialog.upgrade!.unit === '') {
          updatedUser.energyLimit = confirmDialog.upgrade!.value;
        } else {
          updatedUser.energyRegenSpeed = confirmDialog.upgrade!.value;
        }

        updateUser(updatedUser);
      }
    );
  }, [confirmDialog.upgrade, user, updateUser, handlePurchase]);

  // Joker satın alma fonksiyonu
  const handleJokerPurchase = useCallback(async (item: MarketItem) => {
    if (!user) return;

    // Joker miktar kontrolü
    if (item.type === 'single') {
      const jokerType = item.id as keyof typeof user.jokers;
      const currentCount = user.jokers?.[jokerType]?.count || 0;
      
      if (currentCount >= CONSTANTS.MAX_JOKER_COUNT) {
        setPurchaseMessage(`Bu jokerden zaten maksimum miktarda (${CONSTANTS.MAX_JOKER_COUNT} adet) sahipsiniz!`);
        return;
      }
    }

    await handlePurchase(
      item.price,
      item.id,
      'Satın alma başarılı!',
      'Bu ürünü satın almak için daha fazla coin gerekli.',
      async () => {
        const userRef = doc(db, 'users', user.id);
        const updates: any = {
          coins: increment(-item.price)
        };

        if (item.type === 'single') {
          const jokerType = item.id as keyof typeof user.jokers;
          updates[`jokers.${jokerType}.count`] = increment(1);
        } else if (item.type === 'refill') {
          const today = new Date().toISOString().slice(0, 10);
          updates.jokers = {
            eliminate: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
            extraTime: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
            doubleAnswer: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
            autoCorrect: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
          };
        }

        await updateDoc(userRef, updates);
        try {
          // Leaderboard güncellemesi
          await updateDoc(userRef, {
            'leaderboard.updatedAt': new Date().toISOString()
          });
        } catch {}

        const updatedUser = { ...user };
        updatedUser.coins = (user.coins || 0) - item.price;

        if (item.type === 'single') {
          const jokerType = item.id as keyof typeof user.jokers;
          const currentCount = user.jokers?.[jokerType]?.count || 0;
          updatedUser.jokers = { ...user.jokers };
          updatedUser.jokers[jokerType].count = Math.min(currentCount + 1, CONSTANTS.MAX_JOKER_COUNT);
        } else if (item.type === 'refill') {
          const today = new Date().toISOString().slice(0, 10);
          updatedUser.jokers = {
            eliminate: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
            extraTime: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
            doubleAnswer: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
            autoCorrect: { count: CONSTANTS.MAX_JOKER_COUNT, lastReset: today },
          };
        }

        updateUser(updatedUser);
      }
    );
  }, [user, updateUser, handlePurchase]);

  // Enerji doldurma fonksiyonu
  const handleEnergyRefill = useCallback(async () => {
    if (!user) return;

    if ((user.energy || 0) >= (user.energyLimit || CONSTANTS.ENERGY_LIMIT_BASE)) {
      setPurchaseMessage('Enerjin zaten dolu!');
      return;
    }

    await handlePurchase(
      CONSTANTS.ENERGY_REFILL_PRICE,
      'refill_energy',
      'Enerji başarıyla dolduruldu!',
      'Enerjiyi doldurmak için 100 coin gerekli.',
      async () => {
        const userRef = doc(db, 'users', user.id);
        const updates: any = {
          coins: increment(-CONSTANTS.ENERGY_REFILL_PRICE),
          energy: user.energyLimit || CONSTANTS.ENERGY_LIMIT_BASE
        };

        await updateDoc(userRef, updates);
        try {
          // Leaderboard güncellemesi
          await updateDoc(userRef, {
            'leaderboard.updatedAt': new Date().toISOString()
          });
        } catch {}

        const updatedUser = { ...user };
        updatedUser.coins = (user.coins || 0) - CONSTANTS.ENERGY_REFILL_PRICE;
        updatedUser.energy = user.energyLimit || CONSTANTS.ENERGY_LIMIT_BASE;

        updateUser(updatedUser);
      }
    );
  }, [user, updateUser, handlePurchase]);

  // Joker status verileri
  const jokerStatusData = useMemo(() => [
    { type: 'eliminate' as const, count: user?.jokers?.eliminate?.count || 0 },
    { type: 'extraTime' as const, count: user?.jokers?.extraTime?.count || 0 },
    { type: 'doubleAnswer' as const, count: user?.jokers?.doubleAnswer?.count || 0 },
    { type: 'autoCorrect' as const, count: user?.jokers?.autoCorrect?.count || 0 }
  ], [user?.jokers]);

  if (!user) {
    return <div>Kullanıcı oturumu bulunamadı.</div>;
  }

  return (
    <GradientBackground variant="market" showParticles={false}>
      <BackButton />
      <div className="market-container">
        <div className="market-card">
          {/* Header */}
          <div className="market-header">
            <h1 className="market-title">
              <span>🛒</span>
              <span>MARKET</span>
            </h1>
            <div className="market-coin-display">
              <span className="market-coin-icon">🪙</span>
              <span className="market-coin-amount">{user.coins || 0}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-container">
            <button
              onClick={handleJokerTab}
              className={`tab-button ${activeTab === 'joker' ? 'active' : ''}`}
            >
              <span>🎯 Joker Market</span>
            </button>
            <button
              onClick={handleEnergyTab}
              className={`tab-button ${activeTab === 'energy' ? 'active' : ''}`}
            >
              <span>⚡ Enerji Market</span>
            </button>
          </div>

          {/* Purchase Message */}
          {purchaseMessage && (
            <div className={`purchase-message ${purchaseMessage.includes('✅') ? 'success' : 'error'}`}>
              {purchaseMessage}
            </div>
          )}

          {/* Content */}
          <div className="market-content" key={activeTab}>
            {activeTab === 'energy' ? (
              /* Modern Energy Market */
              <div className="energy-market-container">
                <div className="energy-market-header">
                  <h2 className="energy-market-title">⚡ Enerji Geliştirme Merkezi</h2>
                  <p className="energy-market-subtitle">
                    Enerji limitini ve yenilenme hızını geliştir
                  </p>
                </div>

                {/* Enerji Limiti Progress Bar */}
                <SegmentedProgressBar
                  upgrades={energyLimitUpgrades}
                  currentValue={user.energyLimit || CONSTANTS.ENERGY_LIMIT_BASE}
                  maxValue={250}
                  onUpgrade={handleEnergyUpgrade}
                  title="Enerji Limiti"
                  subtitle="Maksimum enerji kapasitesi"
                  unit=""
                  userCoins={user.coins || 0}
                  purchaseLoading={purchaseLoading}
                />

                {/* Enerji Hızı Progress Bar */}
                <SegmentedProgressBar
                  upgrades={energySpeedUpgrades}
                  currentValue={user.energyRegenSpeed || CONSTANTS.ENERGY_SPEED_BASE}
                  maxValue={100}
                  onUpgrade={handleEnergyUpgrade}
                  title="Enerji Hızı"
                  subtitle="Yenilenme süresi (saniye)"
                  unit="s"
                  userCoins={user.coins || 0}
                  purchaseLoading={purchaseLoading}
                />

                {/* Enerjiyi Fulle Kartı */}
                <div className="energy-refill-card">
                  <div className="energy-refill-header">
                    <div className="energy-refill-icon">🔋</div>
                    <div className="energy-refill-info">
                      <h3>Enerjiyi Fulle</h3>
                      <p>Enerjini anında maksimum seviyeye çıkar</p>
                    </div>
                  </div>
                  
                  <div className="energy-refill-content">
                    <div className="energy-refill-price">
                      <span className="price-icon">🪙</span>
                      <span className="price-amount">{CONSTANTS.ENERGY_REFILL_PRICE}</span>
                    </div>
                    
                    <button
                      onClick={handleEnergyRefill}
                      disabled={purchaseLoading === 'refill_energy'}
                      className={`energy-refill-button ${
                        purchaseLoading === 'refill_energy' ? 'loading' :
                        (user.coins || 0) >= CONSTANTS.ENERGY_REFILL_PRICE ? 'available' : 'disabled'
                      }`}
                    >
                      {purchaseLoading === 'refill_energy' ? 'Yükleniyor...' : 'Fulle'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Joker Market Items */
              <>
                {/* Joker Durumu */}
                <div className="joker-status-container">
                  <h3 className="joker-status-title">Joker Durumun</h3>
                  <div className="joker-status-grid">
                    {jokerStatusData.map(({ type, count }) => (
                      <JokerStatusItem key={type} type={type} count={count} />
                    ))}
                  </div>
                </div>

                <div className="market-grid">
                  {jokerItems.map((item) => (
                    <div key={item.id} className="market-item-card">
                      <div className="market-item-header">
                        <span className="market-item-icon">{item.icon}</span>
                        <div className="market-item-info">
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                        </div>
                      </div>

                      <div className="market-item-footer">
                        <div className="price-container">
                          <span className="price-icon">🪙</span>
                          <span className="price-amount">{item.price}</span>
                        </div>

                        <button
                          onClick={() => handleJokerPurchase(item)}
                          disabled={purchaseLoading === item.id}
                          className={`purchase-button ${
                            purchaseLoading === item.id ? 'loading' :
                            (user.coins || 0) >= item.price ? 'available' : 'disabled'
                          }`}
                        >
                          {purchaseLoading === item.id ? 'Satın Alınıyor...' : 'Satın Al'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Onay Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, upgrade: null })}
          onConfirm={handleConfirmUpgrade}
          upgrade={confirmDialog.upgrade}
          userCoins={user.coins || 0}
        />
      </div>
    </GradientBackground>
  );
};

export default Market; 