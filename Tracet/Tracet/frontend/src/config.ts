import { Platform } from 'react-native';

let expoApiUrl: string | undefined;
try {
  const Constants = require('expo-constants');
  expoApiUrl = Constants?.expoConfig?.extra?.apiBaseUrl;
} catch {
}

const envUrl = (process.env.EXPO_PUBLIC_API_URL as string) || undefined;

// An explicitly configured URL always wins, on every platform, so real phones can reach
// the API on the computer's LAN IP or a deployed HTTPS URL. The fallbacks below only
// work on the Android emulator (10.0.2.2 = host machine) and the iOS simulator (localhost).
export const API_BASE_URL =
  envUrl ||
  expoApiUrl ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001');
