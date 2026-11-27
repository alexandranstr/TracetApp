import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Photo from '../../../shared/components/Photo';
import { resolvedPhotoUris } from '../../pins/photos';
import { Pin } from '../../pins/types';

const PINK_ACCENT = '#FF2D55';
const PURPLE_ACCENT = '#AF52DE';
const DARK_BG = '#1C1C1E';

export type MapPin = Pin & { overlapCount?: number };

interface CustomMapMarkerProps {
    pin: MapPin;
    currentUserId?: string | null;
    zoomLevel?: number;
    onRenderChange?: (markerId: string, rendering: boolean) => void;
}

function CustomMapMarker({ pin, currentUserId, zoomLevel = 0.05, onRenderChange }: CustomMapMarkerProps) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [imageError, setImageError] = useState(false);

    const isMyPin = pin.userId === currentUserId;
    const accentColor = isMyPin ? PINK_ACCENT : PURPLE_ACCENT;

    const markerId = String(pin.id);
    const photos = useMemo(() => resolvedPhotoUris(pin), [pin.photoUrlsJson]);

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

    useEffect(() => {
        if (!activePhoto) onRenderChange?.(markerId, false);
    }, [activePhoto]);

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.bubble,
                    {
                        width: baseSize,
                        height: baseSize,
                        borderRadius: baseSize / 2,
                        borderColor: accentColor,
                        borderWidth: isZoomedOut ? 1.5 : 2.5,
                    },
                ]}
            >
                {activePhoto && !imageError ? (
                    <Photo
                        uri={activePhoto}
                        style={styles.image}
                        transition={null}
                        onLoadStart={() => onRenderChange?.(markerId, true)}
                        onDisplay={() => onRenderChange?.(markerId, false)}
                        onError={() => {
                            setImageError(true);
                            onRenderChange?.(markerId, false);
                        }}
                    />
                ) : (
                    <Ionicons
                        name={isCity ? 'business' : 'location'}
                        size={iconSize}
                        color={accentColor}
                    />
                )}
            </View>

            {pin.overlapCount && pin.overlapCount > 1 && !isZoomedOut && (
                <View style={[styles.badge, { backgroundColor: accentColor }]}>
                    <Text style={styles.badgeText}>+{pin.overlapCount}</Text>
                </View>
            )}

            {!isZoomedOut && <View style={[styles.pointer, { borderTopColor: accentColor }]} />}
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