type Platform = 'ios' | 'android';

function loadApiBaseUrl(platform: Platform, envUrl?: string): string {
  const original = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = envUrl;

  let url = '';
  jest.isolateModules(() => {
    jest.replaceProperty(require('react-native').Platform, 'OS', platform);
    jest.doMock('expo-constants', () => ({ expoConfig: { extra: {} } }), { virtual: true });
    url = require('./config').API_BASE_URL;
  });
  jest.restoreAllMocks();

  if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = original;
  return url;
}

describe('API_BASE_URL', () => {
  it.each<Platform>(['ios', 'android'])(
    'uses EXPO_PUBLIC_API_URL on %s',
    (platform) => {
      expect(loadApiBaseUrl(platform, 'http://192.168.1.8:5001')).toBe('http://192.168.1.8:5001');
    },
  );

  it('falls back to the Android emulator host address when nothing is configured', () => {
    expect(loadApiBaseUrl('android')).toBe('http://10.0.2.2:5001');
  });

  it('falls back to localhost on iOS (simulator) when nothing is configured', () => {
    expect(loadApiBaseUrl('ios')).toBe('http://localhost:5001');
  });
});
