import { api, query } from '../../api/client';
import { MessageResponse } from '../../api/types';
import { ChatMessage, ConversationHistory, ConversationsPage, ConversationStarted } from './types';

export const chatApi = {
    conversations: (partnerName?: string) =>
        api.get<ConversationsPage>(`/api/messages/conversations${query({ q: partnerName })}`),
    start: (partnerId: string) => api.post<ConversationStarted>('/api/messages/get-or-create', { partnerId }),
    history: (conversationId: number) => api.get<ConversationHistory>(`/api/messages/history/${conversationId}`),
    sendText: (conversationId: number, text: string) =>
        api.post<ChatMessage>('/api/messages/send', { conversationId, text }),
    sendImage: (conversationId: number, imageUrl: string, text: string) =>
        api.post<ChatMessage>('/api/messages/send-image', { conversationId, imageUrl, text }),
    updateTheme: (conversationId: number, theme: string, messageColor: string) =>
        api.post('/api/messages/update-theme', { conversationId, theme, messageColor }),
    markConversationRead: (conversationId: number) =>
        api.post<MessageResponse>('/api/messages/mark-as-read', { conversationId }),
    markMessageRead: (messageId: number, conversationId: number) =>
        api.post<MessageResponse>('/api/messages/mark-message-read', { messageId, conversationId }),
};
