// Simplified AB Testing for mobile optimization
interface ABTestConfig {
  variant: string;
  weight: number;
}

interface ABTestResult {
  variant: string;
  config: any;
  trackEvent: (event: string, data?: any) => void;
}

const AB_TESTS: Record<string, ABTestConfig[]> = {
  quiz_ui_variant: [
    { variant: 'default', weight: 0.5 },
    { variant: 'minimal', weight: 0.5 }
  ],
  question_loading: [
    { variant: 'standard', weight: 0.7 },
    { variant: 'optimized', weight: 0.3 }
  ]
};

const AB_CONFIGS: Record<string, any> = {
  quiz_ui_variant: {
    default: { theme: 'full' },
    minimal: { theme: 'minimal' }
  },
  question_loading: {
    standard: { cacheSize: 10, preload: false },
    optimized: { cacheSize: 50, preload: true }
  }
};

// Simplified AB test selection
export const useABTest = (testName: string): ABTestResult => {
  const variant = AB_TESTS[testName]?.[0]?.variant || 'default';
  const config = AB_CONFIGS[testName]?.[variant] || {};
  
  const trackEvent = (event: string, data?: any) => {
    // Simplified tracking for mobile
    if (process.env.NODE_ENV === 'development') {
      console.log(`AB Test Event: ${testName}.${event}`, { variant, ...data });
    }
  };
  
  return { variant, config, trackEvent };
};

// Initialize AB tests - simplified
export const initializeABTests = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('AB Tests initialized (simplified for mobile)');
  }
};
