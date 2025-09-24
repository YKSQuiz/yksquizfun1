// Ortak CSS stilleri ve animasyonları

// Ortak değerler
const COMMON_VALUES = {
  title: 'Hangi dersi seçmek istersin?',
  cardBackground: 'linear-gradient(120deg, #e0e7ff 0%, #f8fafc 100%)',
  boxShadowBase: '0 8px 40px'
} as const;

export const subjectStyles = {
  // Animasyonlar
  animations: {
    popIn: `
      @keyframes popIn {
        0% { opacity: 0; transform: scale(0.9) translateY(20px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
    `,
    iconSpin: `
      @keyframes tyt-icon-spin {
        0% { transform: rotate(0deg) scale(1); }
        60% { transform: rotate(18deg) scale(1.18); }
        100% { transform: rotate(0deg) scale(1); }
      }
    `
  },

  // Kart stilleri
  card: {
    base: {
      background: 'var(--card-color)',
      color: 'white',
      fontWeight: 700,
      cursor: 'pointer',
      userSelect: 'none' as const,
      minHeight: 110,
      boxShadow: '0 4px 24px #0002',
      border: 'none',
      transition: 'transform 0.18s, box-shadow 0.18s, filter 0.18s',
      position: 'relative' as const,
      overflow: 'hidden',
      textAlign: 'center' as const,
      padding: '0 8px'
    },
    hover: {
      filter: 'brightness(1.13) saturate(1.15)',
      transform: 'scale(1.06) rotate(-1deg)',
      boxShadow: '0 12px 36px #0003, 0 0 0 4px #fff4',
      zIndex: 2
    },
    active: {
      filter: 'brightness(1.22) saturate(1.2)',
      transform: 'scale(0.97) rotate(1deg)',
      boxShadow: '0 2px 8px #0002'
    }
  },

  // Grid stilleri
  grid: {
    container: {
      margin: '40px 0 20px 0'
    },
    card: {
      position: 'relative' as const,
      overflow: 'hidden',
      padding: '0 14px',
      minWidth: 160,
      maxWidth: 220,
      whiteSpace: 'normal' as const,
      wordBreak: 'break-word' as const,
      textAlign: 'center' as const,
      height: 110,
      width: 220,
      fontSize: 16,
      lineHeight: 1.2
    }
  },

  // İkon stilleri
  icon: {
    base: {
      fontSize: 38,
      marginBottom: 10,
      filter: 'drop-shadow(0 2px 8px #fff8)'
    },
    altKonu: {
      fontSize: 32,
      marginBottom: 10,
      filter: 'drop-shadow(0 2px 8px #fff8)'
    }
  },

  // Shine efekti
  shine: {
    content: '',
    position: 'absolute' as const,
    top: '-60%',
    left: '-60%',
    width: '220%',
    height: '220%',
    background: 'linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.01) 60%)',
    transform: 'rotate(25deg)',
    pointerEvents: 'none' as const,
    zIndex: 1,
    animation: 'tyt-shine-move 2.2s linear infinite'
  },

  // Header stilleri
  header: {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    title: {
      flex: 1,
      textAlign: 'center' as const,
      margin: 0
    },
    spacer: {
      width: 120
    }
  },

  // Card container stilleri
  cardContainer: {
    tyt: {
      background: COMMON_VALUES.cardBackground,
      boxShadow: `${COMMON_VALUES.boxShadowBase} #43e97b22`
    },
    aytSayisal: {
      background: COMMON_VALUES.cardBackground,
      boxShadow: `${COMMON_VALUES.boxShadowBase} #43e97b22`
    },
    aytEa: {
      background: COMMON_VALUES.cardBackground,
      boxShadow: `${COMMON_VALUES.boxShadowBase} #10b98122`
    },
    aytSozel: {
      background: COMMON_VALUES.cardBackground,
      boxShadow: `${COMMON_VALUES.boxShadowBase} #f953c622`
    }
  },

  // Başlık renkleri
  titleColors: {
    tyt: '#6366f1',
    aytSayisal: '#6366f1',
    aytEa: '#10b981',
    aytSozel: '#b91d73'
  }
};

// CSS sınıfları
export const subjectClasses = {
  animatedCard: 'tyt-animated-card',
  animatedIcon: 'tyt-animated-icon',
  shine: 'tyt-shine'
};

// Tema konfigürasyonları
export const themeConfig = {
  tyt: {
    titleColor: subjectStyles.titleColors.tyt,
    cardContainer: subjectStyles.cardContainer.tyt,
    emoji: '🎉',
    title: COMMON_VALUES.title,
    subtitle: 'Her dersin kendine özel soruları seni bekliyor!'
  },
  aytSayisal: {
    titleColor: subjectStyles.titleColors.aytSayisal,
    cardContainer: subjectStyles.cardContainer.aytSayisal,
    emoji: '🔢',
    title: COMMON_VALUES.title,
    subtitle: 'Sayısal derslerin soruları seni bekliyor!'
  },
  aytEa: {
    titleColor: subjectStyles.titleColors.aytEa,
    cardContainer: subjectStyles.cardContainer.aytEa,
    emoji: '⚖️',
    title: COMMON_VALUES.title,
    subtitle: 'Eşit ağırlık derslerinin soruları seni bekliyor!'
  },
  aytSozel: {
    titleColor: subjectStyles.titleColors.aytSozel,
    cardContainer: subjectStyles.cardContainer.aytSozel,
    emoji: '📚',
    title: COMMON_VALUES.title,
    subtitle: 'Sözel derslerin soruları seni bekliyor!'
  }
}; 