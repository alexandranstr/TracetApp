import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { LocationData } from '../pins/components/CreatePinOverlay';
import { MapRegion } from './clustering';
import { Coordinate, PlacePrediction, placesApi } from './placesApi';

export interface SelectedPoint extends Coordinate {
    title: string;
    subtitle?: string;
    cityName?: string;
    countryName?: string;
    googlePlaceId?: string;
    entityType?: number;
}

const CITY = 1;

export function usePlaceSearch(moveTo: (region: MapRegion) => void) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlacePrediction[]>([]);
    const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
    const [boundary, setBoundary] = useState<Coordinate[]>([]);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
    }, []);

    const search = useCallback((text: string) => {
        setQuery(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (text.trim().length < 2) {
            setResults([]);
            return;
        }
        searchTimer.current = setTimeout(async () => {
            try {
                setResults(await placesApi.search(text));
            } catch {
                setResults([]);
            }
        }, 300);
    }, []);

    const clearSearch = useCallback(() => {
        setQuery('');
        setResults([]);
        setBoundary([]);
    }, []);

    const selectPlace = useCallback(async (placeId: string, name: string) => {
        Keyboard.dismiss();
        const place = await placesApi.details(placeId).catch(() => null);
        if (!place) return;

        setSelectedPoint({
            latitude: place.latitude,
            longitude: place.longitude,
            title: name,
            subtitle: place.address,
            cityName: place.cityName,
            countryName: place.countryName,
            googlePlaceId: placeId,
            entityType: place.entityType,
        });
        setQuery(name);
        setResults([]);

        const delta = place.entityType === CITY ? 0.12 : 0.02;
        moveTo({ latitude: place.latitude, longitude: place.longitude, latitudeDelta: delta, longitudeDelta: delta });
        setBoundary(place.entityType === CITY ? await placesApi.cityBoundary(name) : []);
    }, [moveTo]);

    const dropPin = useCallback(async (point: Coordinate) => {
        Keyboard.dismiss();
        const { cityName, countryName, address } = await placesApi.reverseGeocode(point);
        setSelectedPoint({
            ...point,
            title: cityName || 'Dropped Pin',
            subtitle: address,
            cityName,
            countryName,
            entityType: cityName ? CITY : 0,
        });
        setBoundary([]);
        setResults([]);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedPoint(null);
        setBoundary([]);
    }, []);

    const selectedLocation = useMemo<LocationData | null>(
        () =>
            selectedPoint && {
                latitude: selectedPoint.latitude,
                longitude: selectedPoint.longitude,
                placeName: selectedPoint.title,
                address: selectedPoint.subtitle,
                cityName: selectedPoint.cityName || '',
                countryName: selectedPoint.countryName || '',
                googlePlaceId: selectedPoint.googlePlaceId,
                entityType: selectedPoint.entityType ?? 0,
            },
        [selectedPoint]
    );

    return {
        query,
        results,
        selectedPoint,
        selectedLocation,
        boundary,
        search,
        clearSearch,
        selectPlace,
        dropPin,
        clearSelection,
    };
}
