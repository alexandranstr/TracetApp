import { query } from '../../api/client';

const GOOGLE_MAPS_URL = 'https://maps.googleapis.com/maps/api';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface Coordinate {
    latitude: number;
    longitude: number;
}

export interface PlacePrediction {
    place_id: string;
    description: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
}

export interface Place extends Coordinate {
    address: string;
    cityName: string;
    countryName: string;
    entityType: number;
}

interface AddressComponent {
    long_name: string;
    types?: string[];
}

interface GooglePlace {
    formatted_address?: string;
    address_components?: AddressComponent[];
    types?: string[];
    geometry?: { location?: { lat: number; lng: number } };
}

const hasType = (component: AddressComponent, ...types: string[]) =>
    types.some((type) => component.types?.includes(type));

function cityAndCountry(components: AddressComponent[] = []) {
    const city =
        components.filter((c) => hasType(c, 'locality', 'administrative_area_level_3')).pop() ??
        components.find((c) => hasType(c, 'sublocality', 'political'));
    const country = components.filter((c) => hasType(c, 'country')).pop();
    return { cityName: city?.long_name ?? '', countryName: country?.long_name ?? '' };
}

// 1 city, 2 street, 3 neighbourhood, 0 any other place.
function entityTypeOf(types: string[] = []): number {
    if (types.some((t) => ['locality', 'administrative_area_level_1', 'administrative_area_level_2'].includes(t))) return 1;
    if (types.some((t) => ['route', 'street_address'].includes(t))) return 2;
    if (types.some((t) => ['neighborhood', 'sublocality'].includes(t))) return 3;
    return 0;
}

async function google<T>(path: string, params: Record<string, string>): Promise<T> {
    const response = await fetch(`${GOOGLE_MAPS_URL}${path}${query({ ...params, key: MAPS_API_KEY })}`);
    return response.json();
}

export const placesApi = {
    async search(text: string): Promise<PlacePrediction[]> {
        const data = await google<{ predictions?: PlacePrediction[] }>('/place/autocomplete/json', { input: text });
        return data.predictions ?? [];
    },

    async details(placeId: string): Promise<Place | null> {
        const { result } = await google<{ result?: GooglePlace }>('/place/details/json', { place_id: placeId });
        const location = result?.geometry?.location;
        if (!result || !location) return null;
        return {
            latitude: location.lat,
            longitude: location.lng,
            address: result.formatted_address ?? '',
            entityType: entityTypeOf(result.types),
            ...cityAndCountry(result.address_components),
        };
    },

    async reverseGeocode({ latitude, longitude }: Coordinate) {
        const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
            const { results } = await google<{ results?: GooglePlace[] }>('/geocode/json', {
                latlng: `${latitude},${longitude}`,
            });
            const place = results?.[0];
            if (!place) return { cityName: '', countryName: '', address: fallback };
            return { ...cityAndCountry(place.address_components), address: place.formatted_address || fallback };
        } catch {
            return { cityName: '', countryName: '', address: fallback };
        }
    },

    async cityBoundary(cityName: string): Promise<Coordinate[]> {
        try {
            const response = await fetch(
                `${NOMINATIM_URL}${query({ q: cityName, format: 'geojson', polygon_geojson: '1', limit: '1' })}`,
                { headers: { 'User-Agent': 'Tracet/1.0' } }
            );
            const data = await response.json();
            const geometry = data.features?.[0]?.geometry;
            const ring: number[][] =
                geometry?.type === 'Polygon' ? geometry.coordinates[0]
                : geometry?.type === 'MultiPolygon' ? geometry.coordinates[0][0]
                : [];
            return ring.map(([longitude, latitude]) => ({ latitude, longitude }));
        } catch {
            return [];
        }
    },
};
