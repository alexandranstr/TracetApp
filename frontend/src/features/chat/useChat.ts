import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { HubConnection } from '@microsoft/signalr';
import { getAuth } from '@react-native-firebase/auth';
import { processAndUploadImage } from '../../shared/imageUpload';
import { friendsApi } from '../friends/api';
import { chatApi } from './api';
import { createChatConnection, isConnected } from './chatConnection';
import { ChatMessage, ChatTheme } from './types';

const TYPING_IDLE_MS = 2000;
const DEFAULT_THEME: ChatTheme = { backgroundTheme: 'default', messageColor: '#FF2D55' };

interface UseChatOptions {
    conversationId?: number | null;
    partnerId?: string;
    currentUserId?: string;
    youBlockedPartner?: boolean | null;
    partnerBlockedYou?: boolean | null;
}

export function useChat({ partnerId, currentUserId, ...initial }: UseChatOptions) {
    const [conversationId, setConversationId] = useState<number | null>(initial.conversationId ?? null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<ChatTheme>(DEFAULT_THEME);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [youBlockedPartner, setYouBlockedPartner] = useState<boolean | null>(initial.youBlockedPartner ?? null);
    const [partnerBlockedYou, setPartnerBlockedYou] = useState<boolean | null>(initial.partnerBlockedYou ?? null);

    const connection = useRef<HubConnection | null>(null);
    const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const conversationRef = useRef(conversationId);
    const blockStatusKnown = useRef(initial.youBlockedPartner != null);
    conversationRef.current = conversationId;

    const addMessage = useCallback((message: ChatMessage) => {
        setMessages((previous) => (previous.some((m) => m.id === message.id) ? previous : [...previous, message]));
    }, []);

    useFocusEffect(useCallback(() => {
        let active = true;
        (async () => {
            try {
                let id = conversationRef.current;
                if (!id && partnerId) {
                    id = (await chatApi.start(partnerId)).conversationId;
                    if (active) setConversationId(id);
                }
                if (id) {
                    const history = await chatApi.history(id);
                    if (active) {
                        setMessages(history.messages);
                        setTheme({ backgroundTheme: history.backgroundTheme, messageColor: history.messageColor });
                    }
                    await chatApi.markConversationRead(id);
                }
                if (!blockStatusKnown.current && partnerId) {
                    const status = await friendsApi.getBlockStatus(partnerId);
                    blockStatusKnown.current = true;
                    if (active) {
                        setYouBlockedPartner(status.youBlockedPartner);
                        setPartnerBlockedYou(status.partnerBlockedYou);
                    }
                }
            } catch {
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
            if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
        };
    }, [partnerId]));

    useEffect(() => {
        if (!conversationId) return;

        const hub = createChatConnection({
            onMessage: (message) => {
                if (message.conversationId !== conversationId) return;
                addMessage(message);
                if (message.senderId !== currentUserId) {
                    chatApi.markMessageRead(message.id, conversationId).catch(() => {});
                }
            },
            onTyping: (userId, typing) => {
                if (userId === partnerId) setPartnerTyping(typing);
            },
            onMessageRead: (messageId, readBy) => {
                if (readBy === partnerId) {
                    setMessages((previous) => previous.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)));
                }
            },
            onConversationRead: (readConversationId, readBy) => {
                if (readConversationId === conversationId && readBy === partnerId) {
                    setMessages((previous) => previous.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true } : m)));
                }
            },
        });

        connection.current = hub;
        hub.start().then(() => hub.invoke('JoinConversation', conversationId)).catch(() => {});

        return () => {
            if (isConnected(hub)) hub.invoke('LeaveConversation', conversationId).catch(() => {});
            hub.stop().catch(() => {});
            connection.current = null;
        };
    }, [conversationId, currentUserId, partnerId, addMessage]);

    const notifyTyping = useCallback(() => {
        const hub = connection.current;
        if (!conversationId || !isConnected(hub)) return;

        hub.invoke('StartTyping', conversationId).catch(() => {});
        if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = setTimeout(() => {
            if (isConnected(connection.current)) connection.current.invoke('StopTyping', conversationId).catch(() => {});
        }, TYPING_IDLE_MS);
    }, [conversationId]);

    const sendText = useCallback(async (text: string) => {
        if (!conversationId || !text.trim()) return;
        addMessage(await chatApi.sendText(conversationId, text.trim()));
    }, [conversationId, addMessage]);

    const sendImage = useCallback(async (localUri: string, caption: string) => {
        const userId = getAuth().currentUser?.uid;
        if (!conversationId || !userId) return;
        const imageUrl = await processAndUploadImage(localUri, userId, 'chat');
        addMessage(await chatApi.sendImage(conversationId, imageUrl, caption.trim() || 'Photo'));
    }, [conversationId, addMessage]);

    const saveTheme = useCallback(async (next: ChatTheme) => {
        if (!conversationId) return;
        await chatApi.updateTheme(conversationId, next.backgroundTheme, next.messageColor);
        setTheme(next);
    }, [conversationId]);

    const block = useCallback(async () => {
        if (!partnerId) return;
        await friendsApi.block(partnerId);
        setYouBlockedPartner(true);
    }, [partnerId]);

    const unblock = useCallback(async () => {
        if (!partnerId) return;
        await friendsApi.unblock(partnerId);
        setYouBlockedPartner(false);
    }, [partnerId]);

    return {
        conversationId,
        messages,
        loading,
        theme,
        partnerTyping,
        youBlockedPartner,
        partnerBlockedYou,
        notifyTyping,
        sendText,
        sendImage,
        saveTheme,
        block,
        unblock,
    };
}

export function useConversations(partnerName: string) {
    const [conversations, setConversations] = useState<Awaited<ReturnType<typeof chatApi.conversations>>['conversations']>([]);
    const [loading, setLoading] = useState(true);
    const nameRef = useRef(partnerName);
    nameRef.current = partnerName;

    const load = useCallback(async () => {
        try {
            setConversations((await chatApi.conversations(nameRef.current)).conversations);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const firstRun = useRef(true);
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        load();
    }, [partnerName, load]);

    return { conversations, loading, reload: load };
}
