import { ConfigContext, ExpoConfig } from 'expo/config';

// Secrets come from .env (git-ignored), which Expo loads before this file.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tracet',
  slug: 'frontend',
  scheme: 'tracet',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.alexandranstr.frontend',
    googleServicesFile: './firebase/GoogleService-Info.plist',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Tracet needs your location to display your position on the map and drop pins at nearby spots.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Tracet needs your location to display your position on the map.',
    },
  },
  android: {
    package: 'com.alexandranstr.frontend',
    googleServicesFile: './firebase/google-services.json',
    permissions: ['android.permission.RECORD_AUDIO'],
    config: {
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    ['expo-location', { locationAlwaysAndWhenInUsePermission: 'Allow Tracet to use your location.' }],
    ['expo-build-properties', { ios: { useFrameworks: 'static', enableSceneSupport: true } }],
    ['expo-image-picker', { photosPermission: 'Tracet needs access to your photo library to let you pick a profile picture.' }],
    ['@react-native-firebase/app', { ios: { disableSPM: true } }],
    '@react-native-google-signin/google-signin',
    '@react-native-firebase/auth',
    '@react-native-community/datetimepicker',
    'expo-image',
    'expo-font',
  ],
});
