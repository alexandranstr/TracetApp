import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#1C1C1E';

export interface PinData {
    id: number;
    title: string;
    journalEntry: string;
    rating?: number;
    isPrivate: boolean;
    visitedAt: string;
    photoUrlsJson: string;
    tagsVectorJson: string;
    overlapCount?: number;
    userEmail?: string;
    userName?: string;
    location: {
        latitude: number;
        longitude: number;
        cityName?: string;
        countryName?: string;
        placeName?: string;
        entityType: number;
    };
}

interface CustomMapMarkerProps {
    pin: PinData;
    zoomLevel?: number;
    friendColor?: string;
}

function CustomMapMarker({ pin, zoomLevel = 0.05, friendColor = PINK_ACCENT }: CustomMapMarkerProps) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [imageError, setImageError] = useState(false);


    const photos: string[] = useMemo(() => {
        try {
            if (!pin.photoUrlsJson) return [];
            const parsed: string[] = typeof pin.photoUrlsJson === 'string'
                ? JSON.parse(pin.photoUrlsJson)
                : pin.photoUrlsJson;

            return parsed.map((uri) => {
                if (uri.includes('/Documents/')) {
                    const filename = uri.split('/Documents/').pop();
                    return `${FileSystem.documentDirectory}${filename}`;
                }
                return uri;
            });
        } catch (e) {
            console.log('Error parsing photoUrlsJson for pin ID:', pin.id, e);
            return [];
        }
    }, [pin.photoUrlsJson]);

    useEffect(() => {
        setImageError(false);
    }, [currentPhotoIndex, pin.photoUrlsJson]);

    const isZoomedOut = zoomLevel > 10;
    const isCity = pin.location?.entityType === 1;
    const baseSize = isZoomedOut ? 24 : isCity ? 52 : 44;
    const iconSize = isZoomedOut ? 12 : isCity ? 22 : 20;

    useEffect(() => {
        if (photos.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
        }, 30000);

        return () => clearInterval(interval);
    }, [photos]);

    const activePhoto = photos.length > 0 ? photos[currentPhotoIndex] : null;

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.bubble,
                    {
                        width: baseSize,
                        height: baseSize,
                        borderRadius: baseSize / 2,
                        borderColor: friendColor,
                        borderWidth: isZoomedOut ? 1.5 : 2.5,
                    },
                ]}
            >
                {activePhoto && !imageError ? (
                    <Image
                        source={{ uri: activePhoto }}
                        style={styles.image}
                        onError={(e) => {
                            console.log('Image failed to load for Pin #', pin.id, 'URI:', activePhoto, e.nativeEvent.error);
                            setImageError(true);
                        }}
                        resizeMode="cover"
                    />
                ) : (
                    <Ionicons
                        name={isCity ? 'business' : 'location'}
                        size={iconSize}
                        color={friendColor}
                    />
                )}
            </View>


            {pin.overlapCount && pin.overlapCount > 1 && !isZoomedOut && (
                <View style={[styles.badge, { backgroundColor: friendColor }]}>
                    <Text style={styles.badgeText}>+{pin.overlapCount}</Text>
                </View>
            )}

            {!isZoomedOut && <View style={[styles.pointer, { borderTopColor: friendColor }]} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubble: {
        backgroundColor: DARK_BG,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    pointer: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -3,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        paddingHorizontal: 3,
        zIndex: 10,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
});

export default memo(CustomMapMarker);