import * as signalR from '@microsoft/signalr';
import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../api/config';
import { ChatMessage } from './types';

export interface ChatEvents {
    onMessage: (message: ChatMessage) => void;
    onTyping: (userId: string, typing: boolean) => void;
    onMessageRead: (messageId: number, readBy: string) => void;
    onConversationRead: (conversationId: number, readBy: string) => void;
}

export function createChatConnection(events: ChatEvents) {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/chathub`, {
            accessTokenFactory: async () => (await getAuth().currentUser?.getIdToken()) ?? '',
        })
        .withAutomaticReconnect()
        .build();

    connection.on('ReceiveMessage', events.onMessage);
    connection.on('UserTyping', (userId: string) => events.onTyping(userId, true));
    connection.on('UserStopTyping', (userId: string) => events.onTyping(userId, false));
    connection.on('MessageMarkedRead', events.onMessageRead);
    connection.on('MessagesMarkedRead', events.onConversationRead);
    return connection;
}

export const isConnected = (connection: signalR.HubConnection | null): connection is signalR.HubConnection =>
    connection?.state === signalR.HubConnectionState.Connected;
