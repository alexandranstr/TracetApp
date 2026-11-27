import { areaOf, clusterPins, regionAround } from './clustering';
import { MapPin } from './components/CustomMapMarker';

const pin = (id: number, latitude: number, longitude: number) =>
    ({ id, location: { latitude, longitude } }) as MapPin;

describe('clusterPins', () => {
    it('groups pins closer than about 1.5 km and averages their position', () => {
        const [cluster] = clusterPins([pin(1, 45.0, 25.0), pin(2, 45.01, 25.01)]);

        expect(cluster.isCluster).toBe(true);
        expect(cluster.id).toBe('1-2');
        expect(cluster.latitude).toBeCloseTo(45.005);
        expect(cluster.longitude).toBeCloseTo(25.005);
    });

    it('keeps distant pins apart', () => {
        const clusters = clusterPins([pin(1, 45, 25), pin(2, 46, 26)]);

        expect(clusters.map((c) => c.isCluster)).toEqual([false, false]);
    });

    it('skips pins without a location', () => {
        expect(clusterPins([{ id: 1 } as MapPin, pin(2, 45, 25)]).map((c) => c.id)).toEqual(['2']);
    });
});

describe('regionAround', () => {
    it('zooms to twice the spread of the cluster, never closer than 0.01', () => {
        const [cluster] = clusterPins([pin(1, 45.0, 25.0), pin(2, 45.008, 25.0)]);

        const region = regionAround(cluster);

        expect(region.latitudeDelta).toBeCloseTo(0.016);
        expect(region.longitudeDelta).toBe(0.01);
    });
});

describe('areaOf', () => {
    it('turns a map region into the corners the API expects', () => {
        expect(areaOf({ latitude: 45, longitude: 25, latitudeDelta: 1, longitudeDelta: 2 }))
            .toEqual({ swLat: 44, swLng: 23, neLat: 46, neLng: 27 });
    });
});
