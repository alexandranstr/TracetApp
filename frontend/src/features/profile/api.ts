import { api } from '../../api/client';
import { UpdateProfileRequest, UserProfile } from './types';

export const profileApi = {
    get: () => api.get<UserProfile>('/api/auth/profile'),
    update: (changes: UpdateProfileRequest) => api.put<UserProfile>('/api/auth/profile', changes),
    setTwoFactor: (enable: boolean) =>
        api.put<{ isTwoFactorEnabled: boolean }>('/api/auth/toggle-2fa', { enable }),
    deleteAccount: () => api.delete<void>('/api/auth/account'),
};
