import { useEffect, useState } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { authApi } from './api';
import { rememberSession, storedUserId } from './session';

// Firebase restores the session shortly after launch, so a stored user id means "wait a moment".
const RESTORE_DELAY_MS = 600;

export function useAuthSync(initialUserId: string | null) {
    const [userId, setUserId] = useState<string | null>(initialUserId);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                let user = getAuth().currentUser;
                if (!user && (await storedUserId())) {
                    await new Promise((resolve) => setTimeout(resolve, RESTORE_DELAY_MS));
                    user = getAuth().currentUser;
                }
                if (user) {
                    if (active) setUserId(user.uid);
                    await rememberSession(user.uid);
                    await authApi.sync();
                }
            } catch {
                // The screens still work; their own requests report errors.
            } finally {
                if (active) setReady(true);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    return { userId, ready };
}
