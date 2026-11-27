// Extends app.json with values that must not be committed.
// Expo loads .env before evaluating this file, so secrets stay in .env (git-ignored).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
  },
});
