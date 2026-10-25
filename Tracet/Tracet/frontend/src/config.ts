let expoApiUrl: string | undefined;
try {
  const Constants = require('expo-constants');
  expoApiUrl = Constants?.expoConfig?.extra?.apiBaseUrl;
} catch {
}

export const API_BASE_URL =
  expoApiUrl ||
  (process.env.EXPO_PUBLIC_API_URL as string) ||
  'http://localhost:5000';
