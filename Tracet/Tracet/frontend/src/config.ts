import { Platform } from 'react-native';

let expoApiUrl: string | undefined;
try {
  const Constants = require('expo-constants');
  expoApiUrl = Constants?.expoConfig?.extra?.apiBaseUrl;
} catch {
}

const envUrl = (process.env.EXPO_PUBLIC_API_URL as string) || undefined;

export const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5001' :
  expoApiUrl ||
  envUrl ||
  'http://localhost:5001';
