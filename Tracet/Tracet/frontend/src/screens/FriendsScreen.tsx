import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ActivityIndicator,
    ScrollView,
    Platform,
    StatusBar,
    Animated,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

const PINK_ACCENT = '#FF2D55';
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

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

interface UserProfile {
    id: string;
    username: string;
    displayName?: string;
    photoUrl?: string;
    status?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
}

interface RequestUser {
    id: string;
    senderId: string;
    username: string;
    displayName?: string;
    photoUrl?: string;
}

export default function FriendsScreen({ navigation, route }: any) {
    const currentUserId = route?.params?.currentUserId;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');

    const [friends, setFriends] = useState<RequestUser[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<RequestUser[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<RequestUser[]>([]);

    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchSocialData = async () => {
        if (!currentUserId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/friendships/social-overview?userId=${currentUserId}`);
            if (res.ok) {
                const data = await res.json();
                setFriends(data.friends || []);
                setIncomingRequests(data.incomingRequests || []);
                setOutgoingRequests(data.outgoingRequests || []);
            }
        } catch (err) {
            console.log('Error fetching social overview:', err);
        }
    };

    useEffect(() => {
        fetchSocialData();
    }, [currentUserId]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (text.trim().length < 1) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const url = `${API_BASE_URL}/api/friendships/search?q=${encodeURIComponent(text)}&currentUserId=${currentUserId}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                }
            } catch (err) {
                console.log('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 200);
    };

    const sendFriendRequest = async (receiverId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/friendships/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: currentUserId, receiverId }),
            });

            if (res.ok) {
                setSearchResults((prev) =>
                    prev.map((u) => (u.id === receiverId ? { ...u, status: 'pending_sent' } : u))
                );
                fetchSocialData();
            }
        } catch (err) {
            console.log('Failed to send request:', err);
        }
    };

    const respondToRequest = async (senderId: string, action: 'accept' | 'decline') => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/friendships/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentUserId, senderId, action }),
            });

            if (res.ok) {
                fetchSocialData();
            }
        } catch (err) {
            console.log('Failed to respond to request:', err);
        }
    };

    const renderAvatar = (photoUrl?: string) => {
        const resolvedUri = getResolvedImageUri(photoUrl);

        return (
            <TouchableOpacity
                style={styles.avatarContainer}
                activeOpacity={resolvedUri ? 0.8 : 1}
                onPress={() => {
                    if (resolvedUri) setSelectedImageUri(resolvedUri);
                }}
            >
                {resolvedUri ? (
                    <Image source={{ uri: resolvedUri }} style={styles.avatarImage} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#A1A1AA" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtnIcon}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Find Friends</Text>
                    <Text style={styles.headerSubtitle}>
                        {friends.length} friends • {incomingRequests.length} requests
                    </Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchBarContainer, isSearchFocused && styles.searchBarFocused]}>
                <Ionicons
                    name="search"
                    size={18}
                    color={isSearchFocused ? PINK_ACCENT : '#8E8E93'}
                    style={{ marginRight: 10 }}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search name or @username..."
                    placeholderTextColor="#71717A"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {isSearching ? (
                    <ActivityIndicator size="small" color={PINK_ACCENT} />
                ) : searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={18} color="#71717A" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Tabs */}
            {searchQuery.trim().length === 0 && (
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'friends' && styles.tabItemActive]}
                        onPress={() => setActiveTab('friends')}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="people"
                            size={15}
                            color={activeTab === 'friends' ? PINK_ACCENT : '#71717A'}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
                            Friends
                        </Text>
                        <View style={[styles.tabBadge, activeTab === 'friends' && styles.tabBadgeActive]}>
                            <Text style={[styles.tabBadgeText, activeTab === 'friends' && styles.tabBadgeTextActive]}>
                                {friends.length}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'requests' && styles.tabItemActive]}
                        onPress={() => setActiveTab('requests')}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="mail"
                            size={15}
                            color={activeTab === 'requests' ? PINK_ACCENT : '#71717A'}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                            Requests
                        </Text>
                        {incomingRequests.length > 0 && (
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeText}>{incomingRequests.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'sent' && styles.tabItemActive]}
                        onPress={() => setActiveTab('sent')}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="paper-plane"
                            size={15}
                            color={activeTab === 'sent' ? PINK_ACCENT : '#71717A'}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
                            Sent
                        </Text>
                        <View style={[styles.tabBadge, activeTab === 'sent' && styles.tabBadgeActive]}>
                            <Text style={[styles.tabBadgeText, activeTab === 'sent' && styles.tabBadgeTextActive]}>
                                {outgoingRequests.length}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Main Content */}
            {searchQuery.trim().length >= 1 ? (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListHeaderComponent={
                        <AnimatedCard index={0} delay={0}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="search" size={12} color={PINK_ACCENT} style={{ marginRight: 6 }} />
                                <Text style={styles.sectionTitle}>SEARCH RESULTS</Text>
                            </View>
                        </AnimatedCard>
                    }
                    ListEmptyComponent={
                        !isSearching ? (
                            <AnimatedCard index={0} delay={0}>
                                <View style={styles.emptyStateContainer}>
                                    <View style={styles.emptyIconContainer}>
                                        <Ionicons name="search-outline" size={40} color="#3F3F46" />
                                    </View>
                                    <Text style={styles.emptyTitle}>No users found</Text>
                                    <Text style={styles.emptyText}>Try searching for "{searchQuery}"</Text>
                                </View>
                            </AnimatedCard>
                        ) : null
                    }
                    renderItem={({ item, index }) => (
                        <AnimatedCard index={index} delay={60}>
                            <View style={styles.glassCard}>
                                <View style={styles.userInfo}>
                                    {renderAvatar(item.photoUrl)}
                                    <View style={styles.userTextContainer}>
                                        <Text style={styles.displayNameText}>
                                            {item.displayName || item.username}
                                        </Text>
                                        <Text style={styles.usernameText}>@{item.username}</Text>
                                    </View>
                                </View>

                                {item.status === 'pending_sent' ? (
                                    <View style={styles.pendingBadge}>
                                        <Ionicons name="time-outline" size={12} color="#A1A1AA" style={{ marginRight: 4 }} />
                                        <Text style={styles.pendingText}>Requested</Text>
                                    </View>
                                ) : item.status === 'friends' ? (
                                    <View style={styles.friendsBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                                        <Text style={styles.friendsText}>Friends</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.addBtn}
                                        onPress={() => sendFriendRequest(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="person-add" size={14} color="#FFFFFF" />
                                        <Text style={styles.addBtnText}>Add</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </AnimatedCard>
                    )}
                />
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer}>
                    {/* TAB 1: FRIENDS */}
                    {activeTab === 'friends' && (
                        <View>
                            {friends.length > 0 ? (
                                friends.map((friend, idx) => (
                                    <AnimatedCard key={friend.id || idx.toString()} index={idx} delay={60}>
                                        <View style={styles.glassCard}>
                                            <View style={styles.userInfo}>
                                                {renderAvatar(friend.photoUrl)}
                                                <View style={styles.userTextContainer}>
                                                    <Text style={styles.displayNameText}>
                                                        {friend.displayName || friend.username}
                                                    </Text>
                                                    <Text style={styles.usernameText}>@{friend.username}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.friendActions}>
                                                <TouchableOpacity style={styles.iconChatBtn} activeOpacity={0.7}>
                                                    <Ionicons name="chatbubble-ellipses" size={18} color={PINK_ACCENT} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </AnimatedCard>
                                ))
                            ) : (
                                <AnimatedCard index={0} delay={0}>
                                    <View style={styles.emptyStateContainer}>
                                        <View style={styles.emptyIconContainer}>
                                            <Ionicons name="people-outline" size={40} color="#3F3F46" />
                                        </View>
                                        <Text style={styles.emptyTitle}>No friends yet</Text>
                                        <Text style={styles.emptyText}>Search for people to connect with</Text>
                                    </View>
                                </AnimatedCard>
                            )}
                        </View>
                    )}

                    {/* TAB 2: REQUESTS INCOMING */}
                    {activeTab === 'requests' && (
                        <View>
                            {incomingRequests.length > 0 ? (
                                incomingRequests.map((req, idx) => (
                                    <AnimatedCard key={req.id || idx.toString()} index={idx} delay={60}>
                                        <View style={styles.glassCard}>
                                            <View style={styles.userInfo}>
                                                {renderAvatar(req.photoUrl)}
                                                <View style={styles.userTextContainer}>
                                                    <Text style={styles.displayNameText}>
                                                        {req.displayName || req.username}
                                                    </Text>
                                                    <Text style={styles.usernameText}>@{req.username}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.actionRow}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.acceptBtn]}
                                                    onPress={() => respondToRequest(req.senderId, 'accept')}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.declineBtn]}
                                                    onPress={() => respondToRequest(req.senderId, 'decline')}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="close" size={18} color="#A1A1AA" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </AnimatedCard>
                                ))
                            ) : (
                                <AnimatedCard index={0} delay={0}>
                                    <View style={styles.emptyStateContainer}>
                                        <View style={styles.emptyIconContainer}>
                                            <Ionicons name="mail-open-outline" size={40} color="#3F3F46" />
                                        </View>
                                        <Text style={styles.emptyTitle}>No pending requests</Text>
                                        <Text style={styles.emptyText}>When someone adds you, it will show up here</Text>
                                    </View>
                                </AnimatedCard>
                            )}
                        </View>
                    )}

                    {/* TAB 3: SENT REQUESTS OUTGOING */}
                    {activeTab === 'sent' && (
                        <View>
                            {outgoingRequests.length > 0 ? (
                                outgoingRequests.map((req, idx) => (
                                    <AnimatedCard key={req.id || idx.toString()} index={idx} delay={60}>
                                        <View style={styles.glassCard}>
                                            <View style={styles.userInfo}>
                                                {renderAvatar(req.photoUrl)}
                                                <View style={styles.userTextContainer}>
                                                    <Text style={styles.displayNameText}>
                                                        {req.displayName || req.username}
                                                    </Text>
                                                    <Text style={styles.usernameText}>@{req.username}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.pendingBadge}>
                                                <Ionicons name="time-outline" size={12} color="#A1A1AA" style={{ marginRight: 4 }} />
                                                <Text style={styles.pendingText}>Waiting</Text>
                                            </View>
                                        </View>
                                    </AnimatedCard>
                                ))
                            ) : (
                                <AnimatedCard index={0} delay={0}>
                                    <View style={styles.emptyStateContainer}>
                                        <View style={styles.emptyIconContainer}>
                                            <Ionicons name="paper-plane-outline" size={40} color="#3F3F46" />
                                        </View>
                                        <Text style={styles.emptyTitle}>No sent requests</Text>
                                        <Text style={styles.emptyText}>Requests you send will show up here</Text>
                                    </View>
                                </AnimatedCard>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Modal Image View */}
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
                                style={styles.fullCircleImage}
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
    backBtnIcon: {
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
    searchBarContainer: {
        height: 52,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 16,
    },
    searchBarFocused: {
        borderColor: PINK_ACCENT,
        backgroundColor: 'rgba(255, 45, 85, 0.05)',
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        flexDirection: 'row',
    },
    tabItemActive: {
        backgroundColor: 'rgba(255, 45, 85, 0.15)',
        borderColor: 'rgba(255, 45, 85, 0.3)',
        borderWidth: 1,
    },
    tabText: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    tabBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    tabBadgeActive: {
        backgroundColor: 'rgba(255, 45, 85, 0.3)',
    },
    tabBadgeText: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
    },
    tabBadgeTextActive: {
        color: '#FFFFFF',
    },
    badgeCount: {
        backgroundColor: PINK_ACCENT,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    glassCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.09)',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    userTextContainer: {
        marginLeft: 14,
        flex: 1,
    },
    displayNameText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.2,
    },
    usernameText: {
        color: '#A1A1AA',
        fontSize: 13,
        marginTop: 2,
    },
    addBtn: {
        backgroundColor: PINK_ACCENT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    addBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.09)',
    },
    pendingText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600',
    },
    friendsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(52, 199, 89, 0.12)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    friendsText: {
        color: '#34C759',
        fontSize: 12,
        fontWeight: '600',
    },
    friendActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconChatBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 45, 85, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: PINK_ACCENT,
    },
    declineBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
        gap: 8,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyText: {
        color: '#71717A',
        fontSize: 13,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullCircleImage: {
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 3,
        borderColor: PINK_ACCENT,
    },
});