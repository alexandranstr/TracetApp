import { api, query } from '../../api/client';
import { UpdateProfileRequest, UserProfile } from '../profile/types';

export const authApi = {
    sync: () => api.post<UserProfile>('/api/auth/sync'),
    getProfile: () => api.get<UserProfile>('/api/auth/profile'),
    updateProfile: (changes: UpdateProfileRequest) => api.put<UserProfile>('/api/auth/profile', changes),
    setTwoFactor: (enable: boolean) =>
        api.put<{ isTwoFactorEnabled: boolean }>('/api/auth/toggle-2fa', { enable }),
    resolveEmail: (username: string) =>
        api.get<{ email: string }>(`/api/auth/resolve-email${query({ username })}`, { authenticated: false }),
    deleteAccount: () => api.delete<void>('/api/auth/account'),
};
