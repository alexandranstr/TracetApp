import { api, query } from '../../api/client';
import { UserProfile } from '../profile/types';

export const authApi = {
    sync: () => api.post<UserProfile>('/api/auth/sync'),
    resolveEmail: (username: string) =>
        api.get<{ email: string }>(`/api/auth/resolve-email${query({ username })}`, { authenticated: false }),
};
