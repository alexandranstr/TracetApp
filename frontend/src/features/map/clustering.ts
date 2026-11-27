import { MapPin } from './components/CustomMapMarker';

export interface MarkerCluster {
    id: string;
    latitude: number;
    longitude: number;
    pins: MapPin[];
    isCluster: boolean;
}

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

// About 1.5 km.
const CLUSTER_DISTANCE = 0.015;

const hasLocation = (pin: MapPin) => Boolean(pin?.location?.latitude && pin?.location?.longitude);

export function clusterPins(pins: MapPin[]): MarkerCluster[] {
    const used = new Set<number>();
    const clusters: MarkerCluster[] = [];

    pins.forEach((pin, i) => {
        if (used.has(i) || !hasLocation(pin)) return;
        used.add(i);
        const group = [pin];

        for (let j = i + 1; j < pins.length; j++) {
            const other = pins[j];
            if (used.has(j) || !hasLocation(other)) continue;
            if (
                Math.abs(pin.location.latitude - other.location.latitude) < CLUSTER_DISTANCE &&
                Math.abs(pin.location.longitude - other.location.longitude) < CLUSTER_DISTANCE
            ) {
                group.push(other);
                used.add(j);
            }
        }

        clusters.push({
            id: group.map((p) => p.id).join('-'),
            latitude: group.reduce((sum, p) => sum + p.location.latitude, 0) / group.length,
            longitude: group.reduce((sum, p) => sum + p.location.longitude, 0) / group.length,
            pins: group,
            isCluster: group.length > 1,
        });
    });

    return clusters;
}

export function regionAround(cluster: MarkerCluster): MapRegion {
    const latitudes = cluster.pins.map((p) => p.location.latitude);
    const longitudes = cluster.pins.map((p) => p.location.longitude);
    return {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 2, 0.01),
        longitudeDelta: Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 2, 0.01),
    };
}

export const areaOf = (region: MapRegion) => ({
    swLat: region.latitude - region.latitudeDelta,
    swLng: region.longitude - region.longitudeDelta,
    neLat: region.latitude + region.latitudeDelta,
    neLng: region.longitude + region.longitudeDelta,
});
