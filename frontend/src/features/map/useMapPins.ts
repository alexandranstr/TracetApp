import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { pinsApi } from '../pins/api';
import { Pin } from '../pins/types';
import { areaOf, clusterPins, MapRegion } from './clustering';
import { MapPin } from './components/CustomMapMarker';

const VISIBLE_PIN_LIMIT = 200;

export function useMapPins(enabled: boolean) {
    const [pins, setPins] = useState<MapPin[]>([]);
    const areaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reload = useCallback(async () => {
        try {
            setPins((await pinsApi.visible(1, VISIBLE_PIN_LIMIT)).pins);
        } catch {
            // Keep the pins already on the map.
        }
    }, []);

    const loadArea = useCallback((region: MapRegion) => {
        if (areaTimer.current) clearTimeout(areaTimer.current);
        areaTimer.current = setTimeout(async () => {
            try {
                setPins(await pinsApi.nearby(areaOf(region)));
            } catch {
                // Keep the pins already on the map.
            }
        }, 300);
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (enabled) reload();
        }, [enabled, reload])
    );

    useEffect(() => () => {
        if (areaTimer.current) clearTimeout(areaTimer.current);
    }, []);

    const remove = useCallback((pinId: number) => setPins((previous) => previous.filter((p) => p.id !== pinId)), []);
    const replace = useCallback(
        (pin: Pin) => setPins((previous) => previous.map((p) => (p.id === pin.id ? pin : p))),
        []
    );

    const clusters = useMemo(() => clusterPins(pins), [pins]);

    return { clusters, reload, loadArea, remove, replace };
}
