# Components

Bu klasör React bileşenlerini içerir ve feature-based organizasyon kullanır.

## 📁 Klasör Yapısı

```
components/
├── common/           # Ortak bileşenler
│   ├── ui/          # UI bileşenleri (Button, Card, Text)
│   ├── navigation/  # Navigasyon bileşenleri
│   └── subjects/    # Konu seçimi bileşenleri
├── features/        # Özellik bazlı bileşenler
│   ├── auth/        # Kimlik doğrulama
│   ├── quiz/        # Quiz bileşenleri
│   ├── profile/     # Profil bileşenleri
│   ├── stats/       # İstatistik bileşenleri
│   ├── market/      # Market bileşenleri
│   ├── admin/       # Yönetim paneli
│   └── home/        # Ana sayfa
└── pages/           # Sayfa bileşenleri
```

## 🎯 Organizasyon Prensipleri

### Common Bileşenler
- **Yeniden kullanılabilir** bileşenler
- **Generic** ve **configurable** yapıda
- **UI/UX** standartlarına uygun
- **Accessibility** desteği

### Feature Bileşenler
- **Özellik bazlı** organizasyon
- **İlgili bileşenler** bir arada
- **Business logic** içerir
- **State management** kullanır

### Pages Bileşenler
- **Route** bileşenleri
- **Layout** yönetimi
- **Navigation** kontrolü

## 📋 Bileşen Standartları

### Naming Convention
```typescript
// ✅ Doğru
UserProfile.tsx
QuizQuestion.tsx
SubjectCard.tsx

// ❌ Yanlış
userProfile.tsx
quiz_question.tsx
subject-card.tsx
```

### File Structure
```
ComponentName/
├── ComponentName.tsx    # Ana bileşen
├── ComponentName.css    # Stiller (gerekirse)
├── ComponentName.test.tsx # Testler
└── index.ts            # Export
```

### Import/Export Pattern
```typescript
// index.ts
export { default as ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';

// Kullanım
import { ComponentName } from '@/components/common/ui';
```

## 🔧 Geliştirme Rehberi

### Yeni Bileşen Oluşturma
1. Uygun klasörü seçin (common/features/pages)
2. Bileşen klasörü oluşturun
3. TypeScript interface tanımlayın
4. Bileşeni implement edin
5. Test yazın
6. Export edin

### Örnek Bileşen
```typescript
// Button/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  onClick
}) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
```

## 🧪 Testing

### Test Standartları
- **Unit tests** her bileşen için
- **Integration tests** feature bileşenleri için
- **Accessibility tests** common bileşenler için
- **Snapshot tests** UI bileşenleri için

### Test Örneği
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📚 Best Practices

### Performance
- **React.memo** kullanın (gerektiğinde)
- **useMemo** ve **useCallback** optimize edin
- **Lazy loading** uygulayın
- **Code splitting** yapın

### Accessibility
- **ARIA labels** ekleyin
- **Keyboard navigation** destekleyin
- **Screen reader** uyumluluğu sağlayın
- **Color contrast** kontrol edin

### Code Quality
- **TypeScript** strict mode kullanın
- **ESLint** kurallarına uyun
- **Prettier** formatlaması yapın
- **JSDoc** yorumları ekleyin

## 🔄 Migration Guide

### Eski Yapıdan Yeni Yapıya
1. **Bileşenleri** uygun klasörlere taşıyın
2. **Import yollarını** güncelleyin
3. **Export pattern'lerini** düzenleyin
4. **Test dosyalarını** güncelleyin

### Breaking Changes
- Import yolları değişti
- Export pattern'leri güncellendi
- Klasör yapısı yeniden organize edildi 