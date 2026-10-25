import React, { useState, useCallback, useEffect } from 'react';
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
    StatusBar,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config';

const PINK_ACCENT = '#FF2D55';

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

interface ConversationItem {
    conversationId: number;
    partnerId: string;
    username: string;
    displayName: string;
    photoUrl?: string;
    lastMessage: string;
    lastMessageSenderId: string;
    lastMessageAt: string;
    lastMessageRead?: boolean;
    unreadCount?: number;
}

export default function ConversationsScreen({ navigation, route }: any) {
    const currentUserId = route?.params?.currentUserId;
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [loading, setLoading] = useState(true);
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


    const fetchConversations = async (query = '') => {
        try {
            const token = await getAuthToken();
            const url = `${API_BASE_URL}/api/messages/conversations?q=${encodeURIComponent(query)}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.log('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchConversations('');
        }, [])
    );

    useEffect(() => {
        fetchConversations(searchQuery);
    }, [searchQuery]);

    const formatTimestamp = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderAvatar = (photoUrl?: string) => {
        const resolvedUri = getResolvedImageUri(photoUrl);

        return (
            <TouchableOpacity
                activeOpacity={resolvedUri ? 0.8 : 1}
                onPress={() => {
                    if (resolvedUri) setSelectedImageUri(resolvedUri);
                }}
            >
                {resolvedUri ? (
                    <Image source={{ uri: resolvedUri }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={22} color="#71717A" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={18} color="#71717A" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search messages or friends..."
                    placeholderTextColor="#71717A"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#71717A" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={PINK_ACCENT} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.conversationId.toString()}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="chatbubbles-outline" size={32} color="#71717A" />
                            </View>
                            <Text style={styles.emptyTitle}>No conversations yet</Text>
                            <Text style={styles.emptyText}>Start a chat from your friends list to connect!</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const hasUnread = (item.unreadCount ?? 0) > 0;
                        const lastMsgText = item.lastMessage || '';
                        const isMyLastMessage = item.lastMessageSenderId === currentUserId;
                        const isLastMessageRead = item.lastMessageRead ?? true;
                        const hasMessages = Boolean(lastMsgText && lastMsgText.trim().length > 0);

                        let displayMessage = '';
                        if (!hasMessages) {
                            displayMessage = 'Start a conversation';
                        } else if (lastMsgText === 'Photo') {
                            displayMessage = '📷 Photo';
                        } else if (isMyLastMessage) {
                            displayMessage = `You: ${lastMsgText}`;
                        } else {
                            displayMessage = lastMsgText;
                        }

                        return (
                            <TouchableOpacity
                                style={styles.convCard}
                                activeOpacity={0.75}
                                onPress={() => navigation.navigate('ChatScreen', {
                                    conversationId: item.conversationId,
                                    partnerId: item.partnerId,
                                    partnerName: item.displayName,
                                    partnerPhoto: item.photoUrl,
                                    currentUserId
                                })}
                            >
                                <View style={styles.avatarWrapper}>
                                    {renderAvatar(item.photoUrl)}
                                    {hasUnread && <View style={styles.onlineIndicatorDot} />}
                                </View>

                                <View style={styles.convDetails}>
                                    <View style={styles.topRow}>
                                        <Text style={[styles.displayName, hasUnread && styles.displayNameUnread]} numberOfLines={1}>
                                            {item.displayName}
                                        </Text>
                                        <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
                                            {formatTimestamp(item.lastMessageAt)}
                                        </Text>
                                    </View>

                                    <View style={styles.bottomRow}>
                                        <Text
                                            style={[
                                                styles.lastMessage,
                                                !hasMessages && styles.startConversationText,
                                                hasUnread && styles.lastMessageUnread
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {displayMessage}
                                        </Text>

                                        <View style={styles.statusContainer}>
                                            {isMyLastMessage && hasMessages && !hasUnread && (
                                                <Ionicons
                                                    name={isLastMessageRead ? 'checkmark-done' : 'checkmark'}
                                                    size={15}
                                                    color={isLastMessageRead ? '#0A84FF' : '#71717A'}
                                                />
                                            )}
                                            {hasUnread && (
                                                <View style={styles.pinkDot} />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
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
        backgroundColor: '#000000'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.3
    },
    searchBarContainer: {
        height: 48,
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        paddingVertical: 0
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 4
    },
    convCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121212',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    avatarWrapper: {
        position: 'relative'
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    onlineIndicatorDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        backgroundColor: PINK_ACCENT,
        borderWidth: 2,
        borderColor: '#121212'
    },
    convDetails: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    displayName: {
        color: '#E4E4E7',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 10
    },
    displayNameUnread: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    timeText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '500'
    },
    timeTextUnread: {
        color: PINK_ACCENT,
        fontWeight: '700'
    },
    lastMessage: {
        color: '#9A9A9E',
        fontSize: 14,
        flex: 1,
        marginRight: 8,
        fontWeight: '400'
    },
    lastMessageUnread: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    startConversationText: {
        color: '#71717A',
        fontWeight: '400',
        fontStyle: 'italic'
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 16,
        justifyContent: 'flex-end'
    },
    pinkDot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: PINK_ACCENT,
        shadowColor: PINK_ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        paddingHorizontal: 40
    },
    emptyIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6
    },
    emptyText: {
        color: '#71717A',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20
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