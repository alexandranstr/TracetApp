import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { chatApi } from './api';

export function useUnreadCount(enabled: boolean) {
    const [count, setCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return;
            chatApi
                .conversations()
                .then(({ conversations }) => setCount(conversations.reduce((total, c) => total + c.unreadCount, 0)))
                .catch(() => undefined);
        }, [enabled])
    );

    return count;
}
