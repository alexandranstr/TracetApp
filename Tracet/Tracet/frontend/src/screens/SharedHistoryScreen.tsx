import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ActivityIndicator,
    StatusBar,
    Modal,
    TouchableWithoutFeedback,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config';

const PINK_ACCENT = '#FF2D55';

interface SharedPin {
    id: number;
    title: string;
    journalEntry: string;
    category: string;
    rating?: number;
    isPrivate: boolean;
    visitedAt: string;
    createdAt: string;
    userId: string;
    userName: string;
    userPhotoUrl?: string;
    locationId: number;
    location: {
        id: number;
        latitude: number;
        longitude: number;
        cityName?: string;
        countryName?: string;
        address?: string;
        placeName?: string;
        entityType: number;
    };
    photoUrlsJson: string;
}

function AnimatedCard({ children, index, delay = 60 }: { children: React.ReactNode; index: number; delay?: number }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 60,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }, Math.min(index * delay, 300));

        return () => clearTimeout(timer);
    }, [index, delay, fadeAnim, slideAnim]);

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
        >
            {children}
        </Animated.View>
    );
}

const getResolvedImageUri = (photoUrl?: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        return photoUrl;
    }
    if (photoUrl.startsWith('uploads/') || photoUrl.startsWith('/uploads/')) {
        return `${API_BASE_URL}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
    }
    const fileName = photoUrl.split('/').pop();
    return `${FileSystem.documentDirectory}${fileName}`;
};

export default function SharedHistoryScreen({ navigation }: any) {
    const [pins, setPins] = useState<SharedPin[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    const getAuthToken = async () => {
        try {
            const user = getAuth().currentUser;
            if (user) {
                return await user.getIdToken();
            }
        } catch (err) {
            console.log('Error getting auth token:', err);
        }
        return null;
    };

    const fetchSharedPins = useCallback(async (pageNum: number, append = false) => {
        try {
            const token = await getAuthToken();
            const res = await fetch(
                `${API_BASE_URL}/api/pins/shared-history?page=${pageNum}&pageSize=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (res.ok) {
                const data = await res.json();
                const newPins = data.pins || [];
                setPins(prev => append ? [...prev, ...newPins] : newPins);
                setHasMore(data.pagination?.hasNextPage ?? false);
            }
        } catch (err) {
            console.log('Error fetching shared pins:', err);
        } finally {
            if (pageNum === 1) setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchSharedPins(1);
    }, [fetchSharedPins]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchSharedPins(nextPage, true);
        }
    };

    const renderPinCard = ({ item, index }: { item: SharedPin; index: number }) => {
        const photos: string[] = [];
        if (item.photoUrlsJson) {
            try {
                const parsed = JSON.parse(item.photoUrlsJson);
                if (Array.isArray(parsed)) photos.push(...parsed);
            } catch { }
        }

        const locationName = item.location?.placeName || item.location?.cityName || 'Unknown location';
        const countryName = item.location?.countryName || '';
        const displayName = item.userName || 'Anonymous';

        return (
            <AnimatedCard index={index} delay={60}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.userInfo}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (item.userPhotoUrl) {
                                        setSelectedImageUri(getResolvedImageUri(item.userPhotoUrl));
                                    }
                                }}
                            >
                                {item.userPhotoUrl ? (
                                    <Image source={{ uri: getResolvedImageUri(item.userPhotoUrl) || '' }} style={styles.userAvatar} />
                                ) : (
                                    <View style={styles.userAvatarPlaceholder}>
                                        <Ionicons name="person" size={16} color="#A1A1AA" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.userName}>{displayName}</Text>
                        </View>
                        <Text style={styles.pinDate}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>

                    {item.title ? (
                        <Text style={styles.pinTitle}>{item.title}</Text>
                    ) : null}

                    <Text style={styles.pinLocation}>
                        <Ionicons name="location" size={12} color="#A1A1AA" style={{ marginRight: 4 }} />
                        {locationName}{countryName ? `, ${countryName}` : ''}
                    </Text>

                    {item.journalEntry ? (
                        <Text style={styles.journalEntry} numberOfLines={3}>
                            {item.journalEntry}
                        </Text>
                    ) : null}

                    {item.rating ? (
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <Ionicons
                                    key={star}
                                    name={star <= item.rating! ? 'star' : 'star-outline'}
                                    size={14}
                                    color="#FFD700"
                                />
                            ))}
                        </View>
                    ) : null}

                    {photos.length > 0 && (
                        <View style={styles.photosRow}>
                            {photos.slice(0, 3).map((photo, idx) => {
                                const resolved = getResolvedImageUri(photo);
                                if (!resolved) return null;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedImageUri(resolved)}
                                    >
                                        <Image source={{ uri: resolved }} style={styles.photoThumbnail} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {item.category ? (
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{item.category}</Text>
                        </View>
                    ) : null}
                </View>
            </AnimatedCard>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Shared History</Text>
                    <Text style={styles.headerSubtitle}>
                        Pins from your friends
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PINK_ACCENT} />
                </View>
            ) : (
                <FlatList
                    data={pins}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPinCard}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="globe-outline" size={48} color="#3F3F46" />
                            <Text style={styles.emptyTitle}>No shared pins yet</Text>
                            <Text style={styles.emptyText}>
                                When your friends save places, they'll appear here
                            </Text>
                        </View>
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={PINK_ACCENT} />
                            </View>
                        ) : null
                    }
                />
            )}

            <Modal
                visible={!!selectedImageUri}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImageUri(null)}
            >
                <TouchableWithoutFeedback onPress={() => setSelectedImageUri(null)}>
                    <View style={styles.modalOverlay}>
                        {selectedImageUri && (
                            <Image
                                source={{ uri: selectedImageUri }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        color: '#A1A1AA',
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.09)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    userAvatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    pinDate: {
        color: '#A1A1AA',
        fontSize: 12,
    },
    pinTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    pinLocation: {
        color: '#A1A1AA',
        fontSize: 13,
        marginBottom: 8,
    },
    journalEntry: {
        color: '#D4D4D8',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    photosRow: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 6,
    },
    photoThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    categoryBadge: {
        backgroundColor: 'rgba(255, 45, 85, 0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        color: PINK_ACCENT,
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 6,
    },
    emptyText: {
        color: '#71717A',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '90%',
        height: '70%',
        borderRadius: 12,
    },
});
