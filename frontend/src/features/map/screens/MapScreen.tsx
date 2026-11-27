import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { MapPressEvent, Marker, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadCount } from '../../chat/useUnreadCount';
import { usePendingRequestCount } from '../../friends/usePendingRequestCount';
import CreatePinOverlay from '../../pins/components/CreatePinOverlay';
import PinDetailOverlay from '../../pins/components/PinDetailOverlay';
import { Pin } from '../../pins/types';
import { MapRegion, MarkerCluster, regionAround } from '../clustering';
import CustomMapMarker from '../components/CustomMapMarker';
import MapHeaderButtons from '../components/MapHeaderButtons';
import { SearchInput, SearchResults } from '../components/MapSearchBar';
import { useMapPins } from '../useMapPins';
import { usePlaceSearch } from '../usePlaceSearch';

const PINK_ACCENT = '#FF2D55';
const WORLD: MapRegion = Platform.OS === 'android'
    ? { latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }
    : { latitude: 20, longitude: 0, latitudeDelta: 140, longitudeDelta: 140 };

interface MapScreenProps {
    navigation: any;
    userId: string | null;
    ready: boolean;
}

export default function MapScreen({ navigation, userId, ready }: MapScreenProps) {
    const mapRef = useRef<MapView>(null);
    const moveTo = useCallback((region: MapRegion) => mapRef.current?.animateToRegion(region, 800), []);

    const pins = useMapPins(ready);
    const places = usePlaceSearch(moveTo);
    const pendingRequests = usePendingRequestCount(ready);
    const unreadMessages = useUnreadCount(ready);

    const [creatingPin, setCreatingPin] = useState(false);
    const [inspectedPin, setInspectedPin] = useState<Pin | null>(null);
    const [settledMarkers, setSettledMarkers] = useState<ReadonlySet<string>>(new Set());

    // Markers are snapshots on iOS; keep redrawing one until its photo is on screen.
    const setRendering = useCallback((id: string, rendering: boolean) => {
        const apply = () =>
            setSettledMarkers((previous) => {
                if (previous.has(id) !== rendering) return previous;
                const next = new Set(previous);
                rendering ? next.delete(id) : next.add(id);
                return next;
            });
        rendering ? apply() : setTimeout(apply, 250);
    }, []);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
            if (status !== 'granted') return;
            const { coords } = await Location.getCurrentPositionAsync({});
            mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        })().catch(() => undefined);
    }, []);

    const onMarkerPress = (cluster: MarkerCluster) =>
        cluster.isCluster ? moveTo(regionAround(cluster)) : setInspectedPin(cluster.pins[0]);

    const closeCreatePin = () => {
        setCreatingPin(false);
        places.clearSelection();
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_DEFAULT}
                mapType={Platform.OS === 'android' ? 'hybrid' : 'hybridFlyover'}
                userInterfaceStyle="dark"
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
                onPress={(e: MapPressEvent) => places.dropPin(e.nativeEvent.coordinate)}
                onRegionChangeComplete={pins.loadArea}
                initialRegion={WORLD}
            >
                {places.boundary.length > 0 && (
                    <Polygon
                        coordinates={places.boundary}
                        strokeColor={PINK_ACCENT}
                        fillColor="rgba(255, 45, 85, 0.18)"
                        strokeWidth={3}
                    />
                )}

                {pins.clusters.map((cluster) => (
                    <Marker
                        key={cluster.id}
                        coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                        anchor={{ x: 0.5, y: 1.0 }}
                        centerOffset={{ x: 0, y: -20 }}
                        tracksViewChanges={!cluster.isCluster && !settledMarkers.has(cluster.id)}
                        onPress={() => onMarkerPress(cluster)}
                    >
                        {cluster.isCluster ? (
                            <View style={styles.cluster}>
                                <Text style={styles.clusterText}>{cluster.pins.length}</Text>
                            </View>
                        ) : (
                            <CustomMapMarker pin={cluster.pins[0]} currentUserId={userId} onRenderChange={setRendering} />
                        )}
                    </Marker>
                ))}

                {places.selectedPoint && (
                    <Marker coordinate={places.selectedPoint} anchor={{ x: 0.5, y: 1.0 }} tracksViewChanges={false}>
                        <View style={styles.fixedPinWrapper}>
                            <View style={styles.fixedPinCircle}>
                                <Ionicons name="location" size={16} color="#FFFFFF" />
                            </View>
                            <View style={styles.fixedPinPointer} />
                        </View>
                    </Marker>
                )}
            </MapView>

            <SafeAreaView style={styles.headerOverlay}>
                <View style={styles.topRow}>
                    <SearchInput query={places.query} onChange={places.search} onClear={places.clearSearch} />
                    <MapHeaderButtons
                        pendingRequests={pendingRequests}
                        unreadMessages={unreadMessages}
                        onFriends={() => navigation?.navigate('Friends', { currentUserId: userId })}
                        onMessages={() => navigation?.navigate('Messages', { currentUserId: userId })}
                        onSharedHistory={() => navigation?.navigate('SharedHistory')}
                    />
                </View>

                <SearchResults results={places.results} onSelect={places.selectPlace} />

                {places.selectedPoint && (
                    <TouchableOpacity style={styles.addPin} onPress={() => setCreatingPin(true)} activeOpacity={0.85}>
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.addPinText}>Add Pin</Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>

            <CreatePinOverlay
                visible={creatingPin}
                onClose={closeCreatePin}
                currentUserId={userId || ''}
                selectedLocation={places.selectedLocation}
                onPinCreated={() => {
                    pins.reload();
                    closeCreatePin();
                    places.clearSearch();
                }}
            />

            <PinDetailOverlay
                visible={inspectedPin !== null}
                pin={inspectedPin}
                currentUserId={userId || ''}
                onClose={() => setInspectedPin(null)}
                onPinDeleted={(pinId: number) => {
                    pins.remove(pinId);
                    setInspectedPin(null);
                }}
                onPinUpdated={(pin: Pin) => {
                    pins.replace(pin);
                    setInspectedPin(pin);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    headerOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 10 : 30,
        left: 16,
        right: 16,
        zIndex: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cluster: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: PINK_ACCENT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    clusterText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    addPin: {
        alignSelf: 'flex-end',
        marginTop: 12,
        backgroundColor: PINK_ACCENT,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: PINK_ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    addPinText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    fixedPinWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 40,
    },
    fixedPinCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: PINK_ACCENT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 4,
    },
    fixedPinPointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 7,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: PINK_ACCENT,
        marginTop: -1,
    },
});
