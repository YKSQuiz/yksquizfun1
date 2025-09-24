import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yksquiz.app',
  appName: 'YKS Quiz',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    url: 'https://www.yksquiz.fun',
    cleartext: true,
    allowNavigation: [
      'https://accounts.google.com/*',
      'https://www.googleapis.com/*',
      'https://securetoken.googleapis.com/*',
      'https://identitytoolkit.googleapis.com/*',
      'https://yksquizv2.firebaseapp.com/*',
      'https://yksquizv2.web.app/*',
      'https://www.yksquiz.fun/*',
      'https://firebaseapp.com/*',
      'https://*.google.com/*',
      'https://*.googleapis.com/*'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    }
  }
};

export default config;
