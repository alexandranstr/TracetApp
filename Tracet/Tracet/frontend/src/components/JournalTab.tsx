import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    SafeAreaView,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config';

const { width } = Dimensions.get('window');
const PINK_ACCENT = '#FF2D55';
const PURPLE_ACCENT = '#AF52DE';
const DARK_BG = '#1C1C1E';
const CARD_BG = '#2C2C2E';
const SUBTLE_TEXT = '#8E8E93';

interface Statistics {
    totalPins: number;
    averageRating: number;
    countriesVisited: number;
    citiesVisited: number;
    topCountries: { country: string; count: number }[];
    topCities: { city: string; count: number }[];
    topCategories: { category: string; count: number }[];
    topTags: { tagName: string; count: number }[];
    pinsByMonth: { month: number; year: number; count: number }[];
}

interface UserPin {
    id: number;
    title: string;
    journalEntry: string;
    category: string;
    rating?: number;
    isPrivate: boolean;
    visitedAt: string;
    createdAt: string;
    userId: string;
    location: {
        id: number;
        latitude: number;
        longitude: number;
        cityName?: string;
        countryName?: string;
        placeName?: string;
        entityType: number;
    };
    photoUrlsJson: string;
}

interface Pagination {
    currentPage: number;
    pageSize: number;
    totalPins: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

interface JournalTabProps {
    currentUserId?: string | null;
    onPinUpdated?: () => void;
}

export default function JournalTab({ currentUserId, onPinUpdated }: JournalTabProps) {
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [userPins, setUserPins] = useState<UserPin[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        currentPage: 1,
        pageSize: 10,
        totalPins: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
    });

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingPin, setEditingPin] = useState<UserPin | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editJournal, setEditJournal] = useState('');
    const [editIsPrivate, setEditIsPrivate] = useState(false);
    const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const getAuthToken = async () => {
        try {
            let currentUser = getAuth().currentUser;
            if (!currentUser) {
                const storedUserId = await AsyncStorage.getItem('userId');
                if (storedUserId) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    currentUser = getAuth().currentUser;
                }
            }
            if (!currentUser) return null;
            return await currentUser.getIdToken(true);
        } catch (err) {
            console.log('Error getting auth token:', err);
            return null;
        }
    };

    const fetchUserPins = async (page: number = 1) => {
        try {
            const token = await getAuthToken();
            if (!token) {
                setLoading(false);
                return;
            }

            const [statsRes, pinsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/pins/statistics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/pins/my-pins?page=${page}&pageSize=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStatistics(statsData);
            }

            if (pinsRes.ok) {
                const pinsData = await pinsRes.json();
                setUserPins(pinsData.pins || []);
                setPagination(pinsData.pagination || {
                    currentPage: page,
                    pageSize: 10,
                    totalPins: 0,
                    totalPages: 0,
                    hasPreviousPage: false,
                    hasNextPage: false,
                });
            }
        } catch (err) {
            console.log('Error fetching journal data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserPins(1);
    }, [currentUserId]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchUserPins(newPage);
        }
    };

    const openEditModal = (pin: UserPin) => {
        setEditingPin(pin);
        setEditTitle(pin.title);
        setEditJournal(pin.journalEntry);
        setEditIsPrivate(pin.isPrivate);
        try {
            const photos = JSON.parse(pin.photoUrlsJson || '[]');
            setEditPhotoUrls(Array.isArray(photos) ? photos : []);
        } catch {
            setEditPhotoUrls([]);
        }
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setEditingPin(null);
        setEditTitle('');
        setEditJournal('');
        setEditIsPrivate(false);
        setEditPhotoUrls([]);
        setIsSaving(false);
    };

    const saveImagePermanently = async (uri: string): Promise<string> => {
        try {
            const filename = uri.split('/').pop() || `${Date.now()}.jpg`;
            const destPath = `${FileSystem.documentDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: destPath });
            return destPath;
        } catch (err) {
            console.log('Failed to save photo permanently:', err);
            return uri;
        }
    };

    const handlePickPhotos = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Media library access is needed to select photos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 10,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const processedUris: string[] = [];

                for (const asset of result.assets) {
                    try {
                        const manipulated = await manipulateAsync(
                            asset.uri,
                            [],
                            { compress: 0.8, format: SaveFormat.JPEG }
                        );
                        const permanentUri = await saveImagePermanently(manipulated.uri);
                        processedUris.push(permanentUri);
                    } catch {
                        const permanentUri = await saveImagePermanently(asset.uri);
                        processedUris.push(permanentUri);
                    }
                }

                setEditPhotoUrls((prev) => [...prev, ...processedUris]);
            }
        } catch (error) {
            console.log('Error picking image:', error);
        }
    };

    const handleRemoveEditPhoto = (index: number) => {
        setEditPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveEdit = async () => {
        if (!editingPin || !editTitle.trim()) {
            Alert.alert('Title Required', 'Please enter a title for your pin.');
            return;
        }

        setIsSaving(true);
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/pins/${editingPin.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: editTitle,
                    journalEntry: editJournal,
                    isPrivate: editIsPrivate,
                    photoUrlsJson: JSON.stringify(editPhotoUrls),
                }),
            });

            if (response.ok) {
                const updatedPin = await response.json();
                setUserPins((prev) =>
                    prev.map((p) => (p.id === editingPin.id ? { ...p, ...updatedPin } : p))
                );
                closeEditModal();
                if (onPinUpdated) {
                    onPinUpdated();
                }
            } else {
                Alert.alert('Error', 'Failed to update pin.');
            }
        } catch (error) {
            console.log('Error saving pin:', error);
            Alert.alert('Error', 'Could not connect to the server.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    const formatFullDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getMonthName = (month: number) => {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return names[month - 1] || '';
    };

    const maxMonthlyPins = statistics?.pinsByMonth.reduce((max, m) => Math.max(max, m.count), 0) || 1;

    const getPhotoUrls = (photoUrlsJson: string): string[] => {
        try {
            const urls = JSON.parse(photoUrlsJson || '[]');
            if (!Array.isArray(urls)) return [];
            return urls.map(url => {
                if (url.includes('/Documents/')) {
                    const filename = url.split('/Documents/').pop();
                    return `${FileSystem.documentDirectory}${filename}`;
                }
                return url;
            });
        } catch {
            return [];
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PINK_ACCENT} />
                <Text style={styles.loadingText}>Loading your journal...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIconContainer}>
                    <Ionicons name="book" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.headerTitle}>Your Travel Journal</Text>
                <Text style={styles.headerSubtitle}>
                    {statistics?.totalPins || 0} pins across {statistics?.countriesVisited || 0} countries
                </Text>
            </View>

            {/* Statistics Section */}
            <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Your Travel Stats</Text>

                {/* Main Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 45, 85, 0.2)' }]}>
                            <Ionicons name="location" size={22} color={PINK_ACCENT} />
                        </View>
                        <Text style={styles.statValue}>{statistics?.totalPins || 0}</Text>
                        <Text style={styles.statLabel}>Total Pins</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(175, 82, 222, 0.2)' }]}>
                            <Ionicons name="globe" size={22} color={PURPLE_ACCENT} />
                        </View>
                        <Text style={styles.statValue}>{statistics?.countriesVisited || 0}</Text>
                        <Text style={styles.statLabel}>Countries</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}>
                            <Ionicons name="business" size={22} color="#FF9500" />
                        </View>
                        <Text style={styles.statValue}>{statistics?.citiesVisited || 0}</Text>
                        <Text style={styles.statLabel}>Cities</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 214, 10, 0.2)' }]}>
                            <Ionicons name="star" size={22} color="#FFD60A" />
                        </View>
                        <Text style={styles.statValue}>{statistics?.averageRating?.toFixed(1) || '0'}</Text>
                        <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                </View>

                {/* Activity Chart */}
                {statistics?.pinsByMonth && statistics.pinsByMonth.some(m => m.count > 0) && (
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Ionicons name="trending-up" size={18} color={PINK_ACCENT} />
                            <Text style={styles.chartTitle}>Activity (Last 12 Months)</Text>
                        </View>
                        <View style={styles.chartContainer}>
                            {statistics.pinsByMonth.map((month, index) => {
                                const isActive = month.count > 0;
                                return (
                                    <View key={index} style={styles.chartBarContainer}>
                                        {isActive && (
                                            <Text style={styles.chartValue}>{month.count}</Text>
                                        )}
                                        <View style={styles.chartBar}>
                                            <View
                                                style={[
                                                    styles.chartFill,
                                                    {
                                                        height: `${(month.count / maxMonthlyPins) * 100}%`,
                                                        opacity: isActive ? 1 : 0.15
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.chartLabel, isActive && styles.chartLabelActive]}>{getMonthName(month.month)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Top Countries */}
                {statistics?.topCountries && statistics.topCountries.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Top Countries</Text>
                        {statistics.topCountries.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FFD60A' : index === 1 ? '#8E8E93' : '#FF9500' }]}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.listItemText}>{item.country}</Text>
                                </View>
                                <Text style={styles.listItemCount}>{item.count} pins</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Top Cities */}
                {statistics?.topCities && statistics.topCities.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Top Cities</Text>
                        {statistics.topCities.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <Text style={styles.listItemText}>{item.city}</Text>
                                </View>
                                <Text style={styles.listItemCount}>{item.count}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Top Categories */}
                {statistics?.topCategories && statistics.topCategories.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Favorite Categories</Text>
                        {statistics.topCategories.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <Text style={styles.listItemText}>{item.category}</Text>
                                </View>
                                <Text style={styles.listItemCount}>{item.count}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Top Tags */}
                {statistics?.topTags && statistics.topTags.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Most Used Tags</Text>
                        <View style={styles.tagsContainer}>
                            {statistics.topTags.map((tag, index) => (
                                <View key={index} style={styles.tagChip}>
                                    <Text style={styles.tagText}>{tag.tagName}</Text>
                                    <Text style={styles.tagCount}>{tag.count}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Your Pins History Section */}
            <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                    <Text style={styles.sectionTitle}>Your Pins</Text>
                    <Text style={styles.pinCountText}>
                        {pagination.totalPins > 0 ? `${pagination.totalPins} pin${pagination.totalPins !== 1 ? 's' : ''}` : ''}
                    </Text>
                </View>

                {userPins.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="pin-outline" size={48} color={SUBTLE_TEXT} />
                        <Text style={styles.emptyTitle}>No pins yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start adding pins to see your travel history here!
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.timeline}>
                            {userPins.map((pin) => {
                                const photos = getPhotoUrls(pin.photoUrlsJson);
                                return (
                                    <View key={pin.id} style={styles.myPinCard}>
                                        {/* Photos */}
                                        {photos.length > 0 && (
                                            <View style={styles.pinPhotosContainer}>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pinPhotosScroll}>
                                                    {photos.map((photoUrl, idx) => (
                                                        <Image
                                                            key={idx}
                                                            source={{ uri: photoUrl }}
                                                            style={[
                                                                styles.pinPhoto,
                                                                photos.length === 1 && styles.pinPhotoSingle,
                                                            ]}
                                                            resizeMode="cover"
                                                        />
                                                    ))}
                                                </ScrollView>
                                                {photos.length > 2 && (
                                                    <View style={styles.morePhotosBadge}>
                                                        <Text style={styles.morePhotosBadgeText}>+{photos.length - 2}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {/* Pin content */}
                                        <View style={styles.myPinContent}>
                                            <View style={styles.myPinHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.myPinTitle}>{pin.title}</Text>
                                                    {pin.location?.placeName && (
                                                        <View style={styles.locationRow}>
                                                            <Ionicons name="location" size={12} color={PINK_ACCENT} />
                                                            <Text style={styles.locationText}>
                                                                {pin.location.placeName}
                                                                {pin.location.cityName ? `, ${pin.location.cityName}` : ''}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <Text style={styles.myPinDate}>{formatFullDate(pin.createdAt)}</Text>
                                                </View>
                                                <View style={styles.myPinActions}>
                                                    {pin.isPrivate && (
                                                        <View style={styles.privateBadge}>
                                                            <Ionicons name="lock-closed" size={12} color={SUBTLE_TEXT} />
                                                        </View>
                                                    )}
                                                    <TouchableOpacity
                                                        style={styles.editButton}
                                                        onPress={() => openEditModal(pin)}
                                                    >
                                                        <Ionicons name="pencil" size={18} color={PINK_ACCENT} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {pin.journalEntry && (
                                                <Text style={styles.myPinJournal} numberOfLines={3}>
                                                    {pin.journalEntry}
                                                </Text>
                                            )}

                                            <View style={styles.myPinFooter}>
                                                {pin.category && (
                                                    <View style={styles.categoryChip}>
                                                        <Text style={styles.categoryText}>{pin.category}</Text>
                                                    </View>
                                                )}
                                                {pin.rating && (
                                                    <View style={styles.ratingRow}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Ionicons
                                                                key={star}
                                                                name={star <= pin.rating! ? 'star' : 'star-outline'}
                                                                size={12}
                                                                color="#FFD60A"
                                                            />
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <View style={styles.paginationContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.paginationButton,
                                        !pagination.hasPreviousPage && styles.paginationButtonDisabled,
                                    ]}
                                    onPress={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={!pagination.hasPreviousPage}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={24}
                                        color={pagination.hasPreviousPage ? PINK_ACCENT : SUBTLE_TEXT}
                                    />
                                    <Text
                                        style={[
                                            styles.paginationButtonText,
                                            !pagination.hasPreviousPage && styles.paginationButtonTextDisabled,
                                        ]}
                                    >
                                        Previous
                                    </Text>
                                </TouchableOpacity>

                                <Text style={styles.paginationInfo}>
                                    {pagination.currentPage} / {pagination.totalPages}
                                </Text>

                                <TouchableOpacity
                                    style={[
                                        styles.paginationButton,
                                        !pagination.hasNextPage && styles.paginationButtonDisabled,
                                    ]}
                                    onPress={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={!pagination.hasNextPage}
                                >
                                    <Text
                                        style={[
                                            styles.paginationButtonText,
                                            !pagination.hasNextPage && styles.paginationButtonTextDisabled,
                                        ]}
                                    >
                                        Next
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={24}
                                        color={pagination.hasNextPage ? PINK_ACCENT : SUBTLE_TEXT}
                                    />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Edit Pin Modal */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditModal}>
                <SafeAreaView style={styles.editModalContainer}>
                    <View style={styles.editModalHeader}>
                        <TouchableOpacity onPress={closeEditModal} style={styles.editModalClose} disabled={isSaving}>
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.editModalTitle}>Edit Pin</Text>
                        <TouchableOpacity style={styles.editModalSave} onPress={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.editModalSaveText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.editModalContent} keyboardShouldPersistTaps="handled">
                        <Text style={styles.editLabel}>Title</Text>
                        <TextInput
                            style={styles.editInput}
                            placeholder="Pin title..."
                            placeholderTextColor={SUBTLE_TEXT}
                            value={editTitle}
                            onChangeText={setEditTitle}
                        />

                        <Text style={styles.editLabel}>Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editPhotosScroll}>
                            {editPhotoUrls.map((uri, index) => {
                                let displayUri = uri;
                                if (uri.includes('/Documents/')) {
                                    const filename = uri.split('/Documents/').pop();
                                    displayUri = `${FileSystem.documentDirectory}${filename}`;
                                }
                                return (
                                <View key={`${uri}-${index}`} style={styles.editPhotoContainer}>
                                    <Image source={{ uri: displayUri }} style={styles.editPhotoThumbnail} />
                                    <TouchableOpacity
                                        style={styles.editRemovePhoto}
                                        onPress={() => handleRemoveEditPhoto(index)}
                                    >
                                        <Ionicons name="close-circle-sharp" size={22} color={PINK_ACCENT} />
                                    </TouchableOpacity>
                                </View>
                                );
                            })}
                            <TouchableOpacity style={styles.editAddPhoto} onPress={handlePickPhotos}>
                                <Ionicons name="camera-outline" size={26} color={PINK_ACCENT} />
                                <Text style={styles.editAddPhotoText}>Add</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <Text style={styles.editLabel}>Notes</Text>
                        <TextInput
                            style={styles.editJournalInput}
                            multiline
                            numberOfLines={5}
                            placeholder="Your memories and notes..."
                            placeholderTextColor={SUBTLE_TEXT}
                            value={editJournal}
                            onChangeText={setEditJournal}
                        />

                        <View style={styles.editPrivacyRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.editPrivacyTitle}>Private Pin</Text>
                                <Text style={styles.editPrivacySubtitle}>Only visible to you</Text>
                            </View>
                            <Switch
                                value={editIsPrivate}
                                onValueChange={setEditIsPrivate}
                                trackColor={{ false: '#3A3A3C', true: PINK_ACCENT }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: SUBTLE_TEXT,
        fontSize: 16,
        marginTop: 12,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 45, 85, 0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: PINK_ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PINK_ACCENT,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '700',
        marginTop: 16,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#8E8E93',
        fontSize: 15,
        marginTop: 6,
        fontWeight: '500',
    },
    statsSection: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statCard: {
        width: '48%',
        backgroundColor: 'rgba(44, 44, 46, 0.8)',
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
        marginTop: 4,
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 6,
        fontWeight: '500',
    },
    chartCard: {
        backgroundColor: 'rgba(44, 44, 46, 0.8)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    chartTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 140,
    },
    chartBarContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    chartBar: {
        width: 14,
        height: 90,
        backgroundColor: 'rgba(255, 45, 85, 0.1)',
        borderRadius: 7,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    chartFill: {
        width: '100%',
        backgroundColor: PINK_ACCENT,
        borderRadius: 7,
        position: 'absolute',
        bottom: 0,
    },
    chartLabel: {
        color: SUBTLE_TEXT,
        fontSize: 10,
        marginTop: 8,
        fontWeight: '400',
    },
    chartLabelActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    chartValue: {
        color: PINK_ACCENT,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 6,
    },
    listCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    listTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    listItemText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    listItemCount: {
        color: SUBTLE_TEXT,
        fontSize: 13,
    },
    rankBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        color: '#000000',
        fontSize: 11,
        fontWeight: '700',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        backgroundColor: 'rgba(175, 82, 222, 0.2)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagText: {
        color: PURPLE_ACCENT,
        fontSize: 13,
        fontWeight: '500',
    },
    tagCount: {
        color: PURPLE_ACCENT,
        fontSize: 11,
        opacity: 0.7,
    },
    historySection: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    toggleText: {
        color: PINK_ACCENT,
        fontSize: 14,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtitle: {
        color: SUBTLE_TEXT,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 8,
    },
    timeline: {
        gap: 24,
    },
    dateGroup: {
        gap: 12,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dateLine: {
        flex: 1,
        height: 1,
        backgroundColor: CARD_BG,
    },
    dateBadge: {
        backgroundColor: CARD_BG,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    dateText: {
        color: SUBTLE_TEXT,
        fontSize: 12,
        fontWeight: '500',
    },
    pinCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: 14,
    },
    pinHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: PURPLE_ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinInfo: {
        flex: 1,
        marginLeft: 10,
    },
    pinUserName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    pinTime: {
        color: SUBTLE_TEXT,
        fontSize: 12,
    },
    pinTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    locationText: {
        color: SUBTLE_TEXT,
        fontSize: 13,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 6,
    },
    categoryChip: {
        backgroundColor: 'rgba(255, 45, 85, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    categoryText: {
        color: PINK_ACCENT,
        fontSize: 12,
        fontWeight: '500',
    },
    journalEntry: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    journalText: {
        flex: 1,
        color: SUBTLE_TEXT,
        fontSize: 13,
        lineHeight: 18,
    },
    pinCountText: {
        color: SUBTLE_TEXT,
        fontSize: 14,
    },
    myPinCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    pinPhotosContainer: {
        position: 'relative',
    },
    pinPhotosScroll: {
        height: 180,
        overflow: 'hidden',
    },
    pinPhoto: {
        width: 180,
        height: 180,
        marginRight: 4,
        borderRadius: 8,
    },
    pinPhotoSingle: {
        width: '100%',
        height: 180,
        borderRadius: 8,
    },
    morePhotosBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    morePhotosBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    myPinContent: {
        padding: 14,
    },
    myPinHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    myPinTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    myPinDate: {
        color: SUBTLE_TEXT,
        fontSize: 12,
        marginTop: 4,
    },
    myPinActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    privateBadge: {
        backgroundColor: 'rgba(142,142,147,0.2)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    editButton: {
        padding: 4,
    },
    myPinJournal: {
        color: SUBTLE_TEXT,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    myPinFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    paginationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,45,85,0.1)',
        borderRadius: 20,
    },
    paginationButtonDisabled: {
        opacity: 0.3,
    },
    paginationButtonText: {
        color: PINK_ACCENT,
        fontSize: 14,
        fontWeight: '600',
    },
    paginationButtonTextDisabled: {
        color: SUBTLE_TEXT,
    },
    paginationInfo: {
        color: SUBTLE_TEXT,
        fontSize: 14,
        fontWeight: '500',
    },
    editModalContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    editModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    editModalClose: { padding: 4 },
    editModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    editModalSave: {
        backgroundColor: PINK_ACCENT,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editModalSaveText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    editModalContent: {
        padding: 20,
        paddingBottom: 40,
    },
    editLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: SUBTLE_TEXT,
        marginTop: 16,
        marginBottom: 8,
    },
    editInput: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    editPhotosScroll: {
        flexDirection: 'row',
        marginVertical: 4,
    },
    editPhotoContainer: {
        position: 'relative',
        marginRight: 12,
        paddingTop: 8,
        paddingRight: 8,
    },
    editPhotoThumbnail: {
        width: 88,
        height: 88,
        borderRadius: 12,
    },
    editRemovePhoto: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#121212',
        borderRadius: 11,
        zIndex: 10,
    },
    editAddPhoto: {
        width: 88,
        height: 88,
        borderRadius: 12,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAddPhotoText: {
        color: PINK_ACCENT,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    editJournalInput: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 14,
        height: 120,
        textAlignVertical: 'top',
        color: '#FFFFFF',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    editPrivacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    editPrivacyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    editPrivacySubtitle: {
        fontSize: 12,
        color: SUBTLE_TEXT,
        marginTop: 2,
    },
});
