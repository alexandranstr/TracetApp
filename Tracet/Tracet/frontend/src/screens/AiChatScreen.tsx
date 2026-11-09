import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    StatusBar,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PINK_ACCENT = '#FF2D55';

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
}

interface Tag {
    id: number;
    name: string;
}

interface Recommendation {
    id: number;
    title: string;
    category: string;
    description: string;
    matchScore: number;
    matchedTags: string[];
    latitude: number;
    longitude: number;
}

const QUICK_CHIPS = [
    'Recommend me a quiet place',
    'I want a nature adventure',
    'What are good cafes nearby?'
];

export default function AiChatScreen({ navigation, route }: any) {
    const currentUserId = route?.params?.currentUserId;

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', sender: 'ai', text: 'Hi! I\'m Tracet AI, your personal travel guide. How can I help with your travels today?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentRecommendation, setCurrentRecommendation] = useState<Recommendation | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);

    const getAuthToken = async () => {
        try {
            let currentUser = getAuth().currentUser;
            if (!currentUser) {
                await new Promise(resolve => setTimeout(resolve, 500));
                currentUser = getAuth().currentUser;
            }
            if (!currentUser) return null;
            return await currentUser.getIdToken(true);
        } catch (err) {
            return null;
        }
    };

    const fetchTags = async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;
            const response = await fetch(`${API_BASE_URL}/api/tags`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTags(data);
            }
        } catch (err) {
            console.log('Error fetching tags:', err);
        }
    };

    const fetchRecommendations = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) {
                console.log('[RECOMMENDATIONS] No auth token');
                return;
            }

            const url = `${API_BASE_URL}/api/tags/recommendations`;
            console.log('[RECOMMENDATIONS] Fetching from:', url);
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('[RECOMMENDATIONS] Response status:', response.status);

            if (response.ok) {
                const recommendations = await response.json();
                console.log('[RECOMMENDATIONS] Response data:', JSON.stringify(recommendations));
                if (Array.isArray(recommendations) && recommendations.length > 0) {
                    setCurrentRecommendation(recommendations[0]);
                } else {
                    console.log('[RECOMMENDATIONS] Empty array, using fallback');
                    setCurrentRecommendation({
                        id: 0,
                        title: 'Explore New Places',
                        category: 'Travel Spot',
                        description: 'Save more pins to get personalized recommendations!',
                        matchScore: 0,
                        matchedTags: [],
                        latitude: 40.7128,
                        longitude: -74.0060
                    });
                }
            } else {
                const errorText = await response.text();
                console.log('[RECOMMENDATIONS] Error response:', errorText);
                setCurrentRecommendation({
                    id: 0,
                    title: 'Explore New Places',
                    category: 'Travel Spot',
                    description: 'Save more pins to get personalized recommendations!',
                    matchScore: 0,
                    matchedTags: [],
                    latitude: 40.7128,
                    longitude: -74.0060
                });
            }
        } catch (err) {
            console.log('[RECOMMENDATIONS] Exception:', err);
            setCurrentRecommendation({
                id: 0,
                title: 'Explore New Places',
                category: 'Travel Spot',
                description: 'Save more pins to get personalized recommendations!',
                matchScore: 0,
                matchedTags: [],
                latitude: 40.7128,
                longitude: -74.0060
            });
        }
    }, []);

    useEffect(() => {
        fetchTags();
        fetchRecommendations();
    }, [fetchRecommendations]);

    useFocusEffect(
        useCallback(() => {
            fetchRecommendations();
        }, [fetchRecommendations])
    );

    const handleSend = async (textToSend?: string) => {
        const text = textToSend || inputText;
        if (!text.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: text.trim() };
        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setInputText('');
        setLoading(true);

        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: `Got it! Based on your preferences, I've updated the recommendation above for you.`
            };
            setMessages(prev => [...prev, aiMsg]);
            setLoading(false);
        }, 1000);
    };


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Ionicons name="sparkles" size={18} color={PINK_ACCENT} style={{ marginRight: 8 }} />
                    <Text style={styles.headerTitle}>Tracet AI</Text>
                </View>
            </View>

            <KeyboardAvoidingView style={styles.keyboardView} behavior="padding">
                {currentRecommendation && (
                    <View style={styles.recommendationCard}>
                        <View style={styles.recHeaderRow}>
                            <View style={styles.recBadge}>
                                <Ionicons name="compass" size={12} color={PINK_ACCENT} />
                                <Text style={styles.recBadgeText}>{currentRecommendation.category}</Text>
                            </View>
                            {currentRecommendation.matchScore > 0 && (
                                <View style={styles.matchBadge}>
                                    <Text style={styles.matchBadgeText}>{currentRecommendation.matchScore}% Match</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.recTitle}>{currentRecommendation.title}</Text>
                        <Text style={styles.recDescription} numberOfLines={2}>
                            {currentRecommendation.description}
                        </Text>

                        {currentRecommendation.matchedTags.length > 0 && (
                            <View style={styles.matchedTagsRow}>
                                {currentRecommendation.matchedTags.slice(0, 4).map((tag, idx) => (
                                    <View key={idx} style={styles.matchedTagChip}>
                                        <Ionicons name="checkmark" size={10} color={PINK_ACCENT} />
                                        <Text style={styles.matchedTagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                    </View>
                )}

                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.chatContainer}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg) => {
                        const isAi = msg.sender === 'ai';
                        return (
                            <View key={msg.id} style={[styles.bubbleRow, isAi ? styles.rowAi : styles.rowUser]}>
                                {isAi && (
                                    <View style={styles.aiAvatar}>
                                        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                                    </View>
                                )}
                                <View style={[styles.bubble, isAi ? styles.bubbleAi : styles.bubbleUser]}>
                                    <Text style={[styles.bubbleText, isAi ? styles.textAi : styles.textUser]}>
                                        {msg.text}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                    {loading && (
                        <View style={[styles.bubbleRow, styles.rowAi]}>
                            <View style={styles.aiAvatar}>
                                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                            </View>
                            <View style={[styles.bubble, styles.bubbleAi]}>
                                <Text style={styles.textAi}>Thinking...</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                    {QUICK_CHIPS.map((chip, index) => (
                        <TouchableOpacity key={index} style={styles.chip} onPress={() => handleSend(chip)}>
                            <Text style={styles.chipText}>{chip}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.inputField}
                        placeholder="Ask Tracet AI..."
                        placeholderTextColor="#71717A"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity onPress={() => handleSend()} style={styles.sendBtn}>
                        <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#0A0A0A',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    keyboardView: { flex: 1 },
    recommendationCard: {
        backgroundColor: '#0F0F10',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,45,85,0.2)',
        shadowColor: PINK_ACCENT,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3
    },
    recHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    recBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,45,85,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    recBadgeText: { color: PINK_ACCENT, fontSize: 10, fontWeight: '700', marginLeft: 3 },
    matchBadge: { backgroundColor: 'rgba(52,199,89,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    matchBadgeText: { color: '#34C759', fontSize: 10, fontWeight: '700' },
    recTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
    recDescription: { color: '#A1A1AA', fontSize: 11, lineHeight: 15, marginBottom: 8 },
    matchedTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
    matchedTagChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,45,85,0.08)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    matchedTagText: { color: '#E4E4E7', fontSize: 9, fontWeight: '500', marginLeft: 3 },
    chatContainer: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
    bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    rowAi: { justifyContent: 'flex-start' },
    rowUser: { justifyContent: 'flex-end' },
    aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: PINK_ACCENT, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 2 },
    bubble: { maxWidth: '78%', padding: 12, borderRadius: 18 },
    bubbleAi: { backgroundColor: '#1C1C1E', borderBottomLeftRadius: 6 },
    bubbleUser: { backgroundColor: PINK_ACCENT, borderBottomRightRadius: 6 },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    textAi: { color: '#FFFFFF' },
    textUser: { color: '#FFFFFF' },
    chipsContainer: { paddingHorizontal: 16, maxHeight: 44, marginBottom: 10, marginTop: 10 },
    chip: { backgroundColor: '#1C1C1E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', height: 36 },
    chipText: { color: '#E4E4E7', fontSize: 12, fontWeight: '500' },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingBottom: 69,
        backgroundColor: '#0A0A0A',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)'
    },
    inputField: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 14,
        maxHeight: 90,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: PINK_ACCENT,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    }
});