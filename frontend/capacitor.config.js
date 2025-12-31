const config = {
  appId: 'com.apsar.tracker',
  appName: 'APSAR Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // For production, set this to your backend URL
    // url: 'https://your-backend-url.com',
    // For development with Android emulator, use:
    // url: 'http://10.0.2.2:5000'
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#111827",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#2563eb",
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;

