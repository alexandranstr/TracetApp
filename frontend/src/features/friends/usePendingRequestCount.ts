import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { friendsApi } from './api';

export function usePendingRequestCount(enabled: boolean) {
    const [count, setCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return;
            friendsApi.getPendingRequests().then((result) => setCount(result.count)).catch(() => undefined);
        }, [enabled])
    );

    return count;
}
