import { placesApi } from './placesApi';

jest.mock('@react-native-firebase/auth', () => ({ getAuth: jest.fn() }));

const respondWith = (body: unknown) =>
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => body } as Response);

afterEach(() => jest.restoreAllMocks());

describe('placesApi', () => {
    it('reads city, country and type from place details', async () => {
        respondWith({
            result: {
                formatted_address: 'Amsterdam, Netherlands',
                types: ['locality', 'political'],
                geometry: { location: { lat: 52.37, lng: 4.9 } },
                address_components: [
                    { long_name: 'Amsterdam', types: ['locality', 'political'] },
                    { long_name: 'Netherlands', types: ['country', 'political'] },
                ],
            },
        });

        await expect(placesApi.details('abc')).resolves.toEqual({
            latitude: 52.37,
            longitude: 4.9,
            address: 'Amsterdam, Netherlands',
            entityType: 1,
            cityName: 'Amsterdam',
            countryName: 'Netherlands',
        });
    });

    it('falls back to a sublocality when there is no locality', async () => {
        respondWith({
            results: [{
                formatted_address: 'Somewhere',
                address_components: [{ long_name: 'Old Town', types: ['sublocality'] }],
            }],
        });

        await expect(placesApi.reverseGeocode({ latitude: 1, longitude: 2 }))
            .resolves.toEqual({ cityName: 'Old Town', countryName: '', address: 'Somewhere' });
    });

    it('returns the coordinates as the address when geocoding fails', async () => {
        jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

        await expect(placesApi.reverseGeocode({ latitude: 45.12347, longitude: 25.6789 }))
            .resolves.toEqual({ cityName: '', countryName: '', address: '45.1235, 25.6789' });
    });

    it('turns a GeoJSON city outline into map coordinates', async () => {
        respondWith({ features: [{ geometry: { type: 'Polygon', coordinates: [[[4.9, 52.3], [5.0, 52.4]]] } }] });

        await expect(placesApi.cityBoundary('Amsterdam')).resolves.toEqual([
            { latitude: 52.3, longitude: 4.9 },
            { latitude: 52.4, longitude: 5.0 },
        ]);
    });
});
