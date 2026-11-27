import { Pagination } from '../../api/types';

export type AiProvider = 'gemini' | 'tracey';

export interface AiMessage {
    id: string;
    sender: 'user' | 'ai' | 'system';
    text: string;
    provider?: AiProvider;
}

export interface AiHistoryPage {
    messages: { id: string; sender: string; text: string; timestamp: string; provider: AiProvider }[];
    pagination: Pagination;
}

export interface AiReply {
    response: string;
    geminiUnavailable: boolean;
}

export interface Recommendation {
    id: number;
    title: string;
    category: string;
    description: string;
    matchScore: number;
    matchedTags: string[];
    latitude: number;
    longitude: number;
}
