import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    FlatList,
    Dimensions,
    Platform,
    Keyboard,
} from 'react-native';
import MapView, { Marker, Polygon, MapPressEvent, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';

import CreatePinOverlay, { LocationData } from '../components/CreatePinOverlay';
import CustomMapMarker, { PinData } from '../components/CustomMapMarker';
import PinDetailOverlay from '../components/PinDetailOverlay';

const { width } = Dimensions.get('window');
const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#1C1C1E';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

interface SelectedPoint {
    latitude: number;
    longitude: number;
    title: string;
    subtitle?: string;
    googlePlaceId?: string;
    entityType?: number;
}

export default function MainTab({ navigation, route }: any) {
    const [currentUserId, setCurrentUserId] = useState<string | null>(route?.params?.currentUserId || null);

    const mapRef = useRef<MapView>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [savedPins, setSavedPins] = useState<PinData[]>([]);
    const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'Map' | 'AIChat' | 'Journal' | 'Profile'>('Map');
    const [inspectedPin, setInspectedPin] = useState<any | null>(null);
    const [boundaryPolygon, setBoundaryPolygon] = useState<{ latitude: number; longitude: number }[]>([]);
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);

    const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        const resolveUserId = async () => {
            if (currentUserId) return;

            try {
                const storedUserId = await AsyncStorage.getItem('userId');
                if (storedUserId) {
                    setCurrentUserId(storedUserId);
                    return;
                }

                const firebaseUser = getAuth().currentUser;
                if (firebaseUser?.uid) {
                    setCurrentUserId(firebaseUser.uid);
                    await AsyncStorage.setItem('userId', firebaseUser.uid);
                }
            } catch (err) {
                console.log('Error resolving current user ID:', err);
            }
        };

        resolveUserId();
    }, []);

    const applyCoordinateOffsets = (pins: PinData[]): PinData[] => {
        const coordMap: { [key: string]: number } = {};

        return pins.map((pin) => {
            if (!pin?.location?.latitude || !pin?.location?.longitude) return pin;

            const key = `${pin.location.latitude.toFixed(5)},${pin.location.longitude.toFixed(5)}`;
            const count = coordMap[key] || 0;
            coordMap[key] = count + 1;

            if (count === 0) return pin;

            const angle = count * 1.2;
            const distance = 0.00018 * count;

            return {
                ...pin,
                location: {
                    ...pin.location,
                    latitude: pin.location.latitude + distance * Math.cos(angle),
                    longitude: pin.location.longitude + distance * Math.sin(angle),
                },
                overlapCount: count + 1,
            };
        });
    };

    const displayPins = useMemo(() => {
        return applyCoordinateOffsets(savedPins);
    }, [savedPins]);

    const fetchSavedPins = async () => {
        if (!currentUserId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/pins?currentUserId=${currentUserId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('FETCHED PINS FROM SERVER:', JSON.stringify(data, null, 2));
                setSavedPins(data);
            } else {
                console.log('Failed to fetch pins, status:', response.status);
            }
        } catch (error) {
            console.log('Error fetching pins from backend:', error);
        }
    };

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const userLoc = await Location.getCurrentPositionAsync({});
                mapRef.current?.animateToRegion({
                    latitude: userLoc.coords.latitude,
                    longitude: userLoc.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }
        } catch (e) {
            console.log('Location request error:', e);
        }
    };

    useEffect(() => {
        requestLocation();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchSavedPins();
        }
    }, [currentUserId]);

    const handleMapPress = (e: MapPressEvent) => {
        Keyboard.dismiss();
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setSelectedPoint({
            latitude,
            longitude,
            title: 'Dropped Pin',
            subtitle: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            entityType: 0,
        });
        setBoundaryPolygon([]);
        setSearchResults([]);
    };

    const fetchCityBoundary = async (cityName: string) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                cityName
            )}&format=geojson&polygon_geojson=1&limit=1`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'TravelApp/1.0' },
            });
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const geometry = data.features[0].geometry;
                let rawCoords: number[][] = [];

                if (geometry.type === 'Polygon') {
                    rawCoords = geometry.coordinates[0];
                } else if (geometry.type === 'MultiPolygon') {
                    rawCoords = geometry.coordinates[0][0];
                }

                if (rawCoords.length > 0) {
                    const formattedCoords = rawCoords.map((coord) => ({
                        latitude: coord[1],
                        longitude: coord[0],
                    }));
                    setBoundaryPolygon(formattedCoords);
                    return;
                }
            }
            setBoundaryPolygon([]);
        } catch (err) {
            console.log('Error fetching city boundaries:', err);
            setBoundaryPolygon([]);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (text.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${MAPS_API_KEY}`;

            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.predictions) {
                    setSearchResults(data.predictions);
                }
            } catch (err) {
                console.log('Search fetching error:', err);
            }
        }, 300);
    };

    const inferEntityType = (types: string[] = []): number => {
        if (types.includes('locality') || types.includes('administrative_area_level_1') || types.includes('administrative_area_level_2')) {
            return 1;
        }
        if (types.includes('route') || types.includes('street_address')) {
            return 2;
        }
        if (types.includes('neighborhood') || types.includes('sublocality')) {
            return 3;
        }
        return 0;
    };

    const selectPlace = async (placeId: string, mainText: string) => {
        Keyboard.dismiss();
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${MAPS_API_KEY}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.result?.geometry?.location) {
                const { lat, lng } = data.result.geometry.location;
                const placeTypes: string[] = data.result.types || [];
                const entityType = inferEntityType(placeTypes);

                const newPoint = {
                    latitude: lat,
                    longitude: lng,
                    title: mainText,
                    subtitle: data.result.formatted_address,
                    googlePlaceId: placeId,
                    entityType,
                };

                setSelectedPoint(newPoint);
                setSearchQuery(mainText);
                setSearchResults([]);

                if (entityType === 1) {
                    fetchCityBoundary(mainText);
                } else {
                    setBoundaryPolygon([]);
                }

                mapRef.current?.animateToRegion({
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: entityType === 1 ? 0.12 : 0.02,
                    longitudeDelta: entityType === 1 ? 0.12 : 0.02,
                }, 800);
            }
        } catch (err) {
            console.log('Details fetching error:', err);
        }
    };

    const handleAddPin = () => {
        if (!selectedPoint) return;
        setIsOverlayVisible(true);
    };

    const handleCloseOverlay = () => {
        setIsOverlayVisible(false);
        setSelectedPoint(null);
        setBoundaryPolygon([]);
    };

    const handlePinCreated = (newPin: PinData) => {
        fetchSavedPins();
        handleCloseOverlay();
        setSearchQuery('');
    };

    const locationForOverlay: LocationData | null = selectedPoint
        ? {
            latitude: selectedPoint.latitude,
            longitude: selectedPoint.longitude,
            placeName: selectedPoint.title,
            address: selectedPoint.subtitle,
            googlePlaceId: selectedPoint.googlePlaceId,
            entityType: selectedPoint.entityType ?? 0,
        }
        : null;

    const renderContent = () => {
        switch (activeTab) {
            case 'AIChat':
                return (
                    <SafeAreaView style={styles.tabViewContainer}>
                        <Ionicons name="sparkles" size={48} color={PINK_ACCENT} />
                        <Text style={styles.tabTitle}>AI Travel Assistant</Text>
                        <Text style={styles.tabSubtitle}>Ask for trip recommendations and itineraries.</Text>
                    </SafeAreaView>
                );
            case 'Journal':
                return (
                    <SafeAreaView style={styles.tabViewContainer}>
                        <Ionicons name="book" size={48} color={PINK_ACCENT} />
                        <Text style={styles.tabTitle}>Travel Journal</Text>
                        <Text style={styles.tabSubtitle}>Document your trips, photos, and memories.</Text>
                    </SafeAreaView>
                );
            case 'Profile':
                return (
                    <SafeAreaView style={styles.tabViewContainer}>
                        <Ionicons name="person" size={48} color={PINK_ACCENT} />
                        <Text style={styles.tabTitle}>Your Profile</Text>
                        <Text style={styles.tabSubtitle}>View stats, visited countries, and settings.</Text>
                    </SafeAreaView>
                );
            case 'Map':
            default:
                return (
                    <View style={StyleSheet.absoluteFill}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            provider={PROVIDER_DEFAULT}
                            mapType="hybridFlyover"
                            userInterfaceStyle="dark"
                            showsUserLocation={true}
                            showsMyLocationButton={false}
                            showsCompass={false}
                            onPress={handleMapPress}
                            initialRegion={{
                                latitude: 20.0,
                                longitude: 0.0,
                                latitudeDelta: 140,
                                longitudeDelta: 140,
                            }}
                        >
                            {boundaryPolygon.length > 0 && (
                                <Polygon
                                    coordinates={boundaryPolygon}
                                    strokeColor={PINK_ACCENT}
                                    fillColor="rgba(255, 45, 85, 0.18)"
                                    strokeWidth={3}
                                />
                            )}

                            {displayPins.map((pin) => {
                                if (!pin?.location?.latitude || !pin?.location?.longitude) return null;
                                return (
                                    <Marker
                                        key={pin.id}
                                        coordinate={{
                                            latitude: pin.location.latitude,
                                            longitude: pin.location.longitude,
                                        }}
                                        anchor={{ x: 0.5, y: 1.0 }}
                                        centerOffset={{ x: 0, y: -20 }}
                                        tracksViewChanges={false}
                                        onPress={() => setInspectedPin(pin)}
                                    >
                                        <CustomMapMarker pin={pin} />
                                    </Marker>
                                );
                            })}

                            {selectedPoint && (
                                <Marker
                                    coordinate={{ latitude: selectedPoint.latitude, longitude: selectedPoint.longitude }}
                                    anchor={{ x: 0.5, y: 1.0 }}
                                    tracksViewChanges={false}
                                >
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
                                <View style={styles.searchBarContainer}>
                                    <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search cities, places, streets..."
                                        placeholderTextColor="#8E8E93"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setBoundaryPolygon([]); }}>
                                            <Ionicons name="close-circle" size={18} color="#8E8E93" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.headerButtons}>
                                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.navigate('Friends')}>
                                        <Ionicons name="people" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.navigate('Messages')}>
                                        <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {searchResults.length > 0 && (
                                <View style={styles.resultsList}>
                                    <FlatList
                                        data={searchResults}
                                        keyboardShouldPersistTaps="handled"
                                        keyExtractor={(item) => item.place_id}
                                        renderItem={({ item }) => {
                                            const mainText = item.structured_formatting?.main_text || item.description;
                                            const secondaryText = item.structured_formatting?.secondary_text || '';

                                            return (
                                                <TouchableOpacity
                                                    style={styles.resultItem}
                                                    onPress={() => selectPlace(item.place_id, mainText)}
                                                >
                                                    <Ionicons name="location" size={18} color={PINK_ACCENT} style={{ marginRight: 10 }} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.resultMainText}>{mainText}</Text>
                                                        {secondaryText !== '' && (
                                                            <Text style={styles.resultSubText}>{secondaryText}</Text>
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        }}
                                    />
                                </View>
                            )}

                            {selectedPoint && (
                                <TouchableOpacity style={styles.addPinUnderIcons} onPress={handleAddPin} activeOpacity={0.85}>
                                    <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.addPinText}>Add Pin</Text>
                                </TouchableOpacity>
                            )}
                        </SafeAreaView>
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            {renderContent()}

            <CreatePinOverlay
                visible={isOverlayVisible}
                onClose={handleCloseOverlay}
                currentUserId={currentUserId || ''}
                selectedLocation={locationForOverlay}
                onPinCreated={handlePinCreated}
            />

            <PinDetailOverlay
                visible={inspectedPin !== null}
                pin={inspectedPin}
                currentUserId={currentUserId || ''}
                onClose={() => setInspectedPin(null)}
                onPinDeleted={(deletedId: number) => {
                    setSavedPins((prev) => prev.filter((p) => p.id !== deletedId));
                    setInspectedPin(null);
                }}
                onPinUpdated={(updatedPin: any) => {
                    setSavedPins((prev) =>
                        prev.map((p) => (p.id === updatedPin.id ? updatedPin : p))
                    );
                    setInspectedPin(updatedPin);
                }}
            />

            <View style={styles.bottomTabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Map')}>
                    <Ionicons name="map" size={22} color={activeTab === 'Map' ? PINK_ACCENT : '#8E8E93'} />
                    <Text style={[styles.tabLabel, activeTab === 'Map' && styles.activeTabLabel]}>Map</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('AIChat')}>
                    <Ionicons name="sparkles" size={22} color={activeTab === 'AIChat' ? PINK_ACCENT : '#8E8E93'} />
                    <Text style={[styles.tabLabel, activeTab === 'AIChat' && styles.activeTabLabel]}>AI Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Journal')}>
                    <Ionicons name="book" size={22} color={activeTab === 'Journal' ? PINK_ACCENT : '#8E8E93'} />
                    <Text style={[styles.tabLabel, activeTab === 'Journal' && styles.activeTabLabel]}>Journal</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Profile')}>
                    <Ionicons name="person" size={22} color={activeTab === 'Profile' ? PINK_ACCENT : '#8E8E93'} />
                    <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.activeTabLabel]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    map: {
        ...StyleSheet.absoluteFill,
    },
    tabViewContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    tabTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
        marginTop: 16,
    },
    tabSubtitle: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
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
    searchBarContainer: {
        flex: 1,
        height: 46,
        backgroundColor: DARK_BG,
        borderRadius: 23,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: DARK_BG,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    addPinUnderIcons: {
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
    resultsList: {
        backgroundColor: DARK_BG,
        borderRadius: 16,
        marginTop: 8,
        maxHeight: 240,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    resultMainText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    resultSubText: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
    bottomTabBar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 20,
        left: 20,
        right: 20,
        height: 64,
        backgroundColor: DARK_BG,
        borderRadius: 32,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabLabel: {
        color: '#8E8E93',
        fontSize: 11,
        marginTop: 3,
        fontWeight: '500',
    },
    activeTabLabel: {
        color: PINK_ACCENT,
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