import React, { useCallback, useMemo } from "react";

// Joker types
type JokerType = 'eliminate' | 'extraTime' | 'doubleAnswer' | 'autoCorrect';

// Joker data interface
interface JokerData {
  count: number;
}

// Joker configuration
const JOKER_CONFIG: Record<JokerType, { icon: string; name: string }> = {
  eliminate: { icon: '➗', name: 'Elimine Et' },
  extraTime: { icon: '⏰', name: 'Ekstra Süre' },
  doubleAnswer: { icon: '2️⃣', name: 'Çift Cevap' },
  autoCorrect: { icon: '✅', name: 'Otomatik Düzelt' }
} as const;

interface JokerPanelProps {
  jokers: Record<JokerType, JokerData>;
  onUseJoker: (type: JokerType) => void;
  onPurchaseJoker: (type: JokerType) => void;
  isLoading?: boolean;
}

const JokerPanel: React.FC<JokerPanelProps> = React.memo(({ 
  jokers, 
  onUseJoker, 
  onPurchaseJoker, 
  isLoading = false 
}) => {
  // Memoized joker entries
  const jokerEntries = useMemo(() => 
    Object.entries(jokers) as [JokerType, JokerData][],
    [jokers]
  );

  // Memoized event handlers
  const handleUseJoker = useCallback((type: JokerType) => {
    onUseJoker(type);
  }, [onUseJoker]);

  const handlePurchaseJoker = useCallback((type: JokerType) => {
    onPurchaseJoker(type);
  }, [onPurchaseJoker]);

  // Memoized render function for joker item
  const renderJokerItem = useCallback(([type, joker]: [JokerType, JokerData]) => {
    const config = JOKER_CONFIG[type];
    const isDisabled = joker.count <= 0 || isLoading;

    return (
      <div key={type} className="joker-item">
        <div className="joker-icon">
          {config.icon}
        </div>
        <div className="joker-info">
          <span className="joker-name">
            {config.name}
          </span>
          <span className="joker-count">{joker.count}</span>
        </div>
        <div className="joker-actions">
          <button 
            onClick={() => handleUseJoker(type)}
            disabled={isDisabled}
            className="joker-use-btn"
            aria-label={`${config.name} jokerini kullan`}
          >
            Kullan
          </button>
          <button 
            onClick={() => handlePurchaseJoker(type)}
            disabled={isLoading}
            className="joker-purchase-btn"
            aria-label={`${config.name} jokerini satın al`}
          >
            Satın Al
          </button>
        </div>
      </div>
    );
  }, [handleUseJoker, handlePurchaseJoker, isLoading]);

  return (
    <div className="joker-panel">
      <h3>Joker Hakları</h3>
      <div className="joker-grid">
        {jokerEntries.map(renderJokerItem)}
      </div>
    </div>
  );
});

JokerPanel.displayName = 'JokerPanel';

export default JokerPanel; 