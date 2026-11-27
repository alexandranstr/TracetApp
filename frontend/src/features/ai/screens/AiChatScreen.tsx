import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useAiChat } from '../useAiChat';

const PINK_ACCENT = '#FF2D55';

export default function AiChatScreen() {
    const { provider: aiProvider, toggleProvider, messages, loading, send, recommendation: currentRecommendation } = useAiChat();
    const [inputText, setInputText] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

    const handleSend = (textToSend?: string) => {
        const text = textToSend ?? inputText;
        setInputText('');
        textInputRef.current?.clear();
        send(text);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <KeyboardAvoidingView style={styles.keyboardView} behavior="padding">
                {currentRecommendation && (
                    <View style={[styles.recommendationCard, styles.recommendationCardSpacing]}>
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
                        const isSystem = msg.sender === 'system';
                        
                        if (isSystem) {
                            return (
                                <View key={msg.id} style={styles.systemMessageRow}>
                                    <View style={styles.systemMessageBubble}>
                                        <Ionicons name="alert-circle" size={12} color="#A1A1AA" />
                                        <Text style={styles.systemMessageText}>{msg.text}</Text>
                                    </View>
                                </View>
                            );
                        }
                        
                        return (
                            <View key={msg.id} style={[styles.bubbleRow, isAi ? styles.rowAi : styles.rowUser]}>
                                {isAi && (
                                    <View style={styles.aiAvatar}>
                                        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                                    </View>
                                )}
                                <View style={[styles.bubble, isAi ? styles.bubbleAi : styles.bubbleUser]}>
                                    {isAi ? (
                                        <Markdown
                                            style={{
                                                body: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
                                                heading1: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 4 },
                                                heading2: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 4 },
                                                heading3: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 6, marginBottom: 4 },
                                                strong: { color: '#FFFFFF', fontWeight: '700' },
                                                em: { color: '#FFFFFF', fontStyle: 'italic' },
                                                list_item: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
                                                paragraph: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
                                                blockquote: { color: '#A1A1AA', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: PINK_ACCENT, paddingLeft: 8 },
                                                code: { color: '#FF2D55', backgroundColor: 'rgba(255,45,85,0.1)', fontFamily: 'monospace', fontSize: 12 },
                                                code_inline: { color: '#FF2D55', backgroundColor: 'rgba(255,45,85,0.1)', fontFamily: 'monospace', fontSize: 12 },
                                                hr: { borderColor: 'rgba(255,255,255,0.1)', height: 1, marginVertical: 8 },
                                            }}
                                        >
                                            {msg.text}
                                        </Markdown>
                                    ) : (
                                        <Text style={[styles.bubbleText, styles.textUser]}>
                                            {msg.text}
                                        </Text>
                                    )}
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


                <View style={styles.inputBar}>
                    <TextInput
                        ref={textInputRef}
                        style={styles.inputField}
                        placeholder={aiProvider === 'tracey' ? 'Ask Tracey...' : 'Ask Gemini...'}
                        placeholderTextColor="#71717A"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        returnKeyType="send"
                        blurOnSubmit={false}
                        textAlignVertical="top"
                        onSubmitEditing={() => handleSend()}
                    />
                    <TouchableOpacity 
                        onPress={toggleProvider}
                        style={[styles.providerBtn, aiProvider === 'tracey' ? styles.providerBtnTracey : {}]}
                    >
                        <View style={styles.providerBtnContent}>
                            <View style={[styles.providerDot, aiProvider === 'tracey' ? styles.providerDotActive : styles.providerDotInactive]} />
                            <Text style={[styles.providerBtnText, aiProvider === 'tracey' ? styles.providerBtnTextTracey : {}]}>
                                {aiProvider === 'tracey' ? 'Tracey' : 'Gemini'}
                            </Text>
                        </View>
                    </TouchableOpacity>
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
    providerBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    providerBtnTracey: {
        backgroundColor: 'rgba(255,45,85,0.15)',
        borderColor: 'rgba(255,45,85,0.4)'
    },
    providerBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    providerDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    providerDotActive: {
        backgroundColor: PINK_ACCENT
    },
    providerDotInactive: {
        backgroundColor: '#34C759'
    },
    providerBtnText: {
        color: '#E4E4E7',
        fontSize: 11,
        fontWeight: '600'
    },
    providerBtnTextTracey: {
        color: PINK_ACCENT
    },
    systemMessageRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 12,
        marginTop: 4
    },
    systemMessageBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,45,85,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6
    },
    systemMessageText: {
        color: '#A1A1AA',
        fontSize: 11,
        fontStyle: 'italic'
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: PINK_ACCENT,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },
    recommendationCardSpacing: {
        marginBottom: 16
    }
});