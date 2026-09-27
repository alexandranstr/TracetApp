import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Image,
    FlatList,
    Dimensions,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';

const { width } = Dimensions.get('window');
const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#121214';
const CARD_BG = '#1C1C1E';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface PinDetailOverlayProps {
    visible: boolean;
    pin: any | null;
    currentUserId: string;
    onClose: () => void;
    onPinDeleted: (pinId: number) => void;
    onPinUpdated: (updatedPin: any) => void;
}

export default function PinDetailOverlay({
                                             visible,
                                             pin,
                                             currentUserId,
                                             onClose,
                                             onPinDeleted,
                                             onPinUpdated,
                                         }: PinDetailOverlayProps) {
    const [fontsLoaded] = useFonts({
        Caveat_700Bold,
    });

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    if (!pin) return null;

    const isOwner = pin.userId === currentUserId;


    const photoUris: string[] = (() => {
        try {
            if (!pin.photoUrlsJson) return [];
            const raw: string[] = typeof pin.photoUrlsJson === 'string'
                ? JSON.parse(pin.photoUrlsJson)
                : pin.photoUrlsJson;

            return raw.map((uri) => {
                if (uri.includes('/Documents/')) {
                    const fileName = uri.split('/Documents/').pop();
                    return `${FileSystem.documentDirectory}${fileName}`;
                }
                return uri;
            });
        } catch {
            return [];
        }
    })();


    const handleDelete = () => {
        Alert.alert('Delete Pin', 'Are you sure you want to delete this memory?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`http://localhost:5000/api/pins/${pin.id}?userId=${currentUserId}`, {
                            method: 'DELETE',
                        });
                        if (res.ok) {
                            onPinDeleted(pin.id);
                            onClose();
                        }
                    } catch (e) {
                        console.log('Error deleting pin:', e);
                    }
                },
            },
        ]);
    };


    const handleToggleVisibility = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/pins/${pin.id}/visibility?userId=${currentUserId}`,
                { method: 'PATCH' }
            );
            if (res.ok) {
                const data = await res.json();
                onPinUpdated({ ...pin, isPrivate: data.isPrivate });
            }
        } catch (e) {
            console.log('Error updating visibility:', e);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.container}>

                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                            <Ionicons name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>


                        {isOwner && (
                            <View style={styles.ownerActions}>
                                <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleVisibility}>
                                    <Ionicons
                                        name={pin.isPrivate ? 'lock-closed' : 'globe'}
                                        size={14}
                                        color={PINK_ACCENT}
                                    />
                                    <Text style={styles.toggleText}>
                                        {pin.isPrivate ? 'Private' : 'Public'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={handleDelete}>
                                    <Ionicons name="trash" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                        <Text style={[styles.title, fontsLoaded && { fontFamily: 'Caveat_700Bold' }]}>
                            {pin.title || 'Untitled Memory'}
                        </Text>


                        {photoUris.length > 0 ? (
                            <View style={styles.carouselContainer}>
                                <FlatList
                                    data={photoUris}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(_, index) => index.toString()}
                                    onScroll={(e) => {
                                        const slide = Math.round(
                                            e.nativeEvent.contentOffset.x / (width - 48)
                                        );
                                        setActiveImageIndex(slide);
                                    }}
                                    renderItem={({ item }) => (
                                        <View style={styles.imageWrapper}>
                                            <Image
                                                source={{ uri: item }}
                                                style={styles.image}
                                                resizeMode="cover"
                                            />
                                        </View>
                                    )}
                                />


                                <TouchableOpacity
                                    style={styles.likeButton}
                                    activeOpacity={0.8}
                                    onPress={() => setIsLiked(!isLiked)}
                                >
                                    <Ionicons
                                        name={isLiked ? 'heart' : 'heart-outline'}
                                        size={20}
                                        color={isLiked ? PINK_ACCENT : '#FFFFFF'}
                                    />
                                </TouchableOpacity>

                                {photoUris.length > 1 && (
                                    <View style={styles.paginationDots}>
                                        {photoUris.map((_, idx) => (
                                            <View
                                                key={idx}
                                                style={[
                                                    styles.dot,
                                                    activeImageIndex === idx && styles.activeDot,
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.noPhotoBox}>
                                <Ionicons name="image-outline" size={36} color="#8E8E93" />
                                <Text style={styles.noPhotoText}>No photos attached</Text>
                            </View>
                        )}


                        <View style={styles.userBadge}>
                            <View style={styles.avatarCircle}>
                                <Ionicons name="person" size={12} color="#FFFFFF" />
                            </View>
                            <Text style={styles.usernameText}>
                                {pin.userName || pin.user?.userName || 'Traveler'}
                            </Text>
                        </View>


                        {pin.journalEntry ? (
                            <View style={styles.journalBox}>
                                <Text style={styles.journalText}>{pin.journalEntry}</Text>
                            </View>
                        ) : null}


                        {pin.location?.address ? (
                            <View style={styles.locationFooter}>
                                <Ionicons name="location-sharp" size={16} color={PINK_ACCENT} />
                                <Text style={styles.locationText}>{pin.location.address}</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        height: '88%',
        backgroundColor: DARK_BG,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: CARD_BG,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    deleteBtn: {
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        borderColor: 'rgba(255, 59, 48, 0.25)',
    },
    ownerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: CARD_BG,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 45, 85, 0.35)',
    },
    toggleText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        color: '#FFFFFF',
        textAlign: 'center',
        marginVertical: 12,
        alignSelf: 'stretch',
        flexWrap: 'wrap',
    },
    carouselContainer: {
        width: width - 48,
        height: 280,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: CARD_BG,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        position: 'relative',
    },
    imageWrapper: {
        width: width - 48,
        height: 280,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    likeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    paginationDots: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    activeDot: {
        backgroundColor: PINK_ACCENT,
        width: 16,
    },
    noPhotoBox: {
        width: width - 48,
        height: 160,
        borderRadius: 22,
        backgroundColor: CARD_BG,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    noPhotoText: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 6,
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: CARD_BG,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    avatarCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: PINK_ACCENT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    usernameText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
    journalBox: {
        width: '100%',
        backgroundColor: CARD_BG,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    journalText: {
        color: '#E5E5EA',
        fontSize: 14,
        lineHeight: 22,
    },
    locationFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 4,
    },
    locationText: {
        color: '#8E8E93',
        fontSize: 13,
    },
});