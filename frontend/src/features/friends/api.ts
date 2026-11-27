import { api, query } from '../../api/client';
import { MessageResponse } from '../../api/types';
import {
    BlockedUsersPage,
    BlockStatus,
    FriendRequestAction,
    PendingFriendRequests,
    SocialOverview,
    UserSearchResult,
} from './types';

export const friendsApi = {
    search: (text: string) => api.get<UserSearchResult[]>(`/api/friendships/search${query({ q: text })}`),
    getOverview: () => api.get<SocialOverview>('/api/friendships/social-overview'),
    getPendingRequests: () => api.get<PendingFriendRequests>('/api/friendships/requests'),
    sendRequest: (receiverId: string) => api.post<MessageResponse>('/api/friendships/request', { receiverId }),
    respond: (senderId: string, action: FriendRequestAction) =>
        api.post<MessageResponse>('/api/friendships/respond', { senderId, action }),
    block: (targetUserId: string) => api.post<MessageResponse>('/api/friendships/block', { targetUserId }),
    unblock: (targetUserId: string) => api.post<MessageResponse>('/api/friendships/unblock', { targetUserId }),
    getBlockStatus: (userId: string) => api.get<BlockStatus>(`/api/friendships/block-status/${encodeURIComponent(userId)}`),
    getBlocked: () => api.get<BlockedUsersPage>('/api/friendships/blocked'),
};
