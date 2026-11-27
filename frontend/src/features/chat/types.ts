import { Pagination } from '../../api/types';

export interface ChatMessage {
    id: number;
    conversationId: number;
    senderId: string;
    text: string;
    imageUrl?: string | null;
    isRead: boolean;
    sentAt: string;
}

export interface ConversationSummary {
    conversationId: number;
    partnerId: string;
    username: string;
    displayName: string;
    photoUrl?: string | null;
    lastMessage: string;
    lastMessageSenderId: string;
    lastMessageAt: string;
    lastMessageRead: boolean;
    unreadCount: number;
    backgroundTheme: string;
    messageColor: string;
    youBlockedPartner: boolean;
    partnerBlockedYou: boolean;
}

export interface ConversationsPage {
    conversations: ConversationSummary[];
    pagination: Pagination;
}

export interface ConversationStarted {
    conversationId: number;
    backgroundTheme?: string | null;
    messageColor: string;
}

export interface ConversationHistory {
    backgroundTheme: string;
    messageColor: string;
    messages: ChatMessage[];
    skip: number;
    take: number;
}

export interface ChatTheme {
    backgroundTheme: string;
    messageColor: string;
}
