import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Animated,
    Modal,
    TouchableWithoutFeedback,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config';
import { resolveImageUri } from '../utils/imageUpload';

const PINK_ACCENT = '#FF2D55';

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
    return resolveImageUri(photoUrl);
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

interface BlockedUser {
    blockedUserId: string;
    username: string;
    displayName?: string;
    photoUrl?: string;
    blockedAt: string;
}

export default function FriendsScreen({ navigation, route }: any) {
    const currentUserId = route?.params?.currentUserId;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent' | 'blocked'>('friends');

    const [friends, setFriends] = useState<RequestUser[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<RequestUser[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<RequestUser[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const fetchSocialData = async () => {
        try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/friendships/social-overview`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out blocked users from friends list
                const blockedUserIds = new Set(blockedUsers.map((u) => u.blockedUserId));
                const filteredFriends = (data.friends || []).filter((f: any) => !blockedUserIds.has(f.id));
                setFriends(filteredFriends);
                setIncomingRequests(data.incomingRequests || []);
                setOutgoingRequests(data.outgoingRequests || []);
            }
        } catch (err) {
            console.log('Error fetching social overview:', err);
        }
    };

    const fetchBlockedUsers = async () => {
        try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/friendships/blocked`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBlockedUsers(data.blockedUsers || []);
            }
        } catch (err) {
            console.log('Error fetching blocked users:', err);
        }
    };

    useEffect(() => {
        fetchSocialData();
        fetchBlockedUsers();
    }, []);

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
                const token = await getAuthToken();
                const url = `${API_BASE_URL}/api/friendships/search?q=${encodeURIComponent(text)}`;
                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
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
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/friendships/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ receiverId }),
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
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/friendships/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ senderId, action }),
            });

            if (res.ok) {
                fetchSocialData();
            }
        } catch (err) {
            console.log('Failed to respond to request:', err);
        }
    };

    const handleBlock = async (targetUserId: string) => {
        try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/friendships/block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId }),
            });
            if (res.ok) {
                // Remove from friends and add to blocked
                const blockedFriend = friends.find((f) => f.id === targetUserId);
                setFriends((prev) => prev.filter((f) => f.id !== targetUserId));
                if (blockedFriend) {
                    setBlockedUsers((prev) => [
                        ...prev,
                        {
                            blockedUserId: blockedFriend.id,
                            username: blockedFriend.username,
                            displayName: blockedFriend.displayName,
                            photoUrl: blockedFriend.photoUrl,
                            blockedAt: new Date().toISOString()
                        }
                    ]);
                }
            }
        } catch (err) {
            console.log('Error blocking user:', err);
        }
    };

    const handleUnblock = async (targetUserId: string) => {
        try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/friendships/unblock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId }),
            });

            if (res.ok) {
                const unblockedUser = blockedUsers.find((u) => u.blockedUserId === targetUserId);
                setBlockedUsers((prev) => prev.filter((u) => u.blockedUserId !== targetUserId));
                // Re-add to friends if they were friends before blocking
                if (unblockedUser) {
                    setFriends((prev) => [
                        ...prev,
                        {
                            id: unblockedUser.blockedUserId,
                            senderId: '',
                            username: unblockedUser.username,
                            displayName: unblockedUser.displayName,
                            photoUrl: unblockedUser.photoUrl
                        }
                    ]);
                }
            }
        } catch (err) {
            console.log('Failed to unblock user:', err);
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

            {searchQuery.trim().length === 0 && (
                <View style={styles.tabsWrapper}>
                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'friends' && styles.tabItemActive]}
                            onPress={() => setActiveTab('friends')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="people"
                                size={18}
                                color={activeTab === 'friends' ? PINK_ACCENT : '#71717A'}
                                style={{ marginRight: 6 }}
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
                                size={18}
                                color={activeTab === 'requests' ? PINK_ACCENT : '#71717A'}
                                style={{ marginRight: 6 }}
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
                    </View>

                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'sent' && styles.tabItemActive]}
                            onPress={() => setActiveTab('sent')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="paper-plane"
                                size={18}
                                color={activeTab === 'sent' ? PINK_ACCENT : '#71717A'}
                                style={{ marginRight: 6 }}
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

                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'blocked' && styles.tabItemActive]}
                            onPress={() => setActiveTab('blocked')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="ban"
                                size={18}
                                color={activeTab === 'blocked' ? PINK_ACCENT : '#71717A'}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.tabText, activeTab === 'blocked' && styles.tabTextActive]}>
                                Blocked
                            </Text>
                            <View style={[styles.tabBadge, activeTab === 'blocked' && styles.tabBadgeActive]}>
                                <Text style={[styles.tabBadgeText, activeTab === 'blocked' && styles.tabBadgeTextActive]}>
                                    {blockedUsers.length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
                                                <TouchableOpacity
                                                    style={styles.iconChatBtn}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        navigation.navigate('ChatScreen', {
                                                            partnerId: friend.id,
                                                            partnerName: friend.displayName || friend.username,
                                                            partnerPhoto: friend.photoUrl,
                                                            currentUserId
                                                        });
                                                    }}
                                                >
                                                    <Ionicons name="chatbubble-ellipses" size={18} color={PINK_ACCENT} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.iconChatBtn, { marginLeft: 12 }]}
                                                    activeOpacity={0.7}
                                                    onPress={() => handleBlock(friend.id)}
                                                >
                                                    <Ionicons name="ban-outline" size={18} color="#EF4444" />
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

                    {activeTab === 'blocked' && (
                        <View>
                            {blockedUsers.length > 0 ? (
                                blockedUsers.map((user, idx) => (
                                    <AnimatedCard key={user.blockedUserId || idx.toString()} index={idx} delay={60}>
                                        <View style={styles.glassCard}>
                                            <View style={styles.userInfo}>
                                                {renderAvatar(user.photoUrl)}
                                                <View style={styles.userTextContainer}>
                                                    <Text style={styles.displayNameText}>
                                                        {user.displayName || user.username}
                                                    </Text>
                                                    <Text style={styles.usernameText}>@{user.username}</Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.unblockBtn}
                                                onPress={() => handleUnblock(user.blockedUserId)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                                                <Text style={styles.unblockBtnText}>Unblock</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </AnimatedCard>
                                ))
                            ) : (
                                <AnimatedCard index={0} delay={0}>
                                    <View style={styles.emptyStateContainer}>
                                        <View style={styles.emptyIconContainer}>
                                            <Ionicons name="ban-outline" size={40} color="#3F3F46" />
                                        </View>
                                        <Text style={styles.emptyTitle}>No blocked users</Text>
                                        <Text style={styles.emptyText}>Users you block will show up here</Text>
                                    </View>
                                </AnimatedCard>
                            )}
                        </View>
                    )}
                </ScrollView>
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
        paddingTop: 16,
        paddingBottom: 20,
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
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 20,
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
    tabsWrapper: {
        marginHorizontal: 20,
        marginBottom: 24,
        gap: 8,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 6,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
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
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    tabBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginLeft: 6,
    },
    tabBadgeActive: {
        backgroundColor: 'rgba(255, 45, 85, 0.3)',
    },
    tabBadgeText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
    },
    tabBadgeTextActive: {
        color: '#FFFFFF',
    },
    badgeCount: {
        backgroundColor: PINK_ACCENT,
        borderRadius: 10,
        paddingHorizontal: 7,
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
        paddingBottom: 60,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
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
        padding: 18,
        borderRadius: 22,
        marginBottom: 16,
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
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    userTextContainer: {
        marginLeft: 16,
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
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 22,
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
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 18,
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
        gap: 6,
        backgroundColor: 'rgba(52, 199, 89, 0.12)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 18,
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
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: PINK_ACCENT,
    },
    declineBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    unblockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 199, 89, 0.12)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 22,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    unblockBtnText: {
        color: '#34C759',
        fontSize: 13,
        fontWeight: '700',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
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
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    }
});