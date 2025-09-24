// Market sistemi tipleri
export interface MarketItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'joker' | 'energy';
  type: 'single' | 'refill' | 'upgrade';
  icon: string;
  isAvailable: boolean;
  stock?: number;
  requiredLevel?: number; // Sıralı açılma için gerekli seviye
} 