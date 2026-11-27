import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { aiApi } from './api';
import { AiMessage, AiProvider, Recommendation } from './types';

const WELCOME: Record<AiProvider, string> = {
    gemini: "Hi! I'm Gemini, your personal travel guide. How can I help with your travels today?",
    tracey: "Hi! I'm Tracey, your travel assistant. How can I help?",
};

const FALLBACK_RECOMMENDATION: Recommendation = {
    id: 0,
    title: 'Explore New Places',
    category: 'Travel Spot',
    description: 'Save more pins to get personalized recommendations!',
    matchScore: 0,
    matchedTags: [],
    latitude: 40.7128,
    longitude: -74.006,
};

const welcomeMessage = (provider: AiProvider): AiMessage => ({ id: 'welcome', sender: 'ai', text: WELCOME[provider] });

export function useAiChat() {
    const [provider, setProvider] = useState<AiProvider>('gemini');
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

    const loadHistory = useCallback(async (selected: AiProvider) => {
        try {
            const history = await aiApi.history(selected);
            const loaded = history.messages.map<AiMessage>((m) => ({
                id: m.id,
                sender: m.sender === 'user' ? 'user' : 'ai',
                text: m.text,
                provider: m.provider,
            }));
            setMessages(loaded.length > 0 ? loaded : [welcomeMessage(selected)]);
        } catch {
            setMessages([welcomeMessage(selected)]);
        }
    }, []);

    const loadRecommendation = useCallback(async () => {
        try {
            const recommendations = await aiApi.recommendations();
            setRecommendation(recommendations[0] ?? FALLBACK_RECOMMENDATION);
        } catch {
            setRecommendation(FALLBACK_RECOMMENDATION);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        loadRecommendation();
        loadHistory(provider);
    }, [loadRecommendation, loadHistory, provider]));

    const send = useCallback(async (text: string) => {
        const message = text.trim();
        if (!message) return;

        setMessages((previous) => [...previous, { id: `user-${Date.now()}`, sender: 'user', text: message, provider }]);
        setLoading(true);
        try {
            const reply = await aiApi.chat(message, provider);
            setMessages((previous) => reply.geminiUnavailable && provider === 'gemini'
                ? [...previous.slice(0, -1), { id: `system-${Date.now()}`, sender: 'system', text: reply.response }]
                : [...previous, { id: `ai-${Date.now()}`, sender: 'ai', text: reply.response, provider }]);
        } catch (e) {
            setMessages((previous) => [...previous, { id: `error-${Date.now()}`, sender: 'ai', text: (e as Error).message }]);
        } finally {
            setLoading(false);
        }
    }, [provider]);

    const toggleProvider = useCallback(() => {
        setProvider((current) => (current === 'gemini' ? 'tracey' : 'gemini'));
    }, []);

    return { provider, toggleProvider, messages, loading, send, recommendation };
}
