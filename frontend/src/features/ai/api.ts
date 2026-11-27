import { api, query } from '../../api/client';
import { AiHistoryPage, AiProvider, AiReply, Recommendation } from './types';

const CHAT_TIMEOUT_MS = 90_000;

export const aiApi = {
    history: (provider: AiProvider) => api.get<AiHistoryPage>(`/api/ai/history${query({ provider })}`),
    chat: (message: string, provider: AiProvider) =>
        api.post<AiReply>('/api/ai/chat', { message, provider }, { timeoutMs: CHAT_TIMEOUT_MS }),
    recommendations: () => api.get<Recommendation[]>('/api/tags/recommendations'),
};
