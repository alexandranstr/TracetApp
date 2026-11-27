import { Pagination } from '../../api/types';

export type Relationship = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface UserSearchResult {
    id: string;
    username: string;
    displayName?: string;
    photoUrl?: string;
    status?: Relationship;
}

export interface SocialUser {
    id: string;
    senderId: string;
    username: string;
    displayName?: string;
    photoUrl?: string;
}

export interface SocialOverview {
    friends: SocialUser[];
    incomingRequests: SocialUser[];
    outgoingRequests: SocialUser[];
    pagination: Pagination;
}

export interface PendingFriendRequest {
    id: number;
    senderId: string;
    username: string;
    displayName: string;
    photoUrl?: string;
}

export interface PendingFriendRequests {
    count: number;
    requests: PendingFriendRequest[];
    pagination: Pagination;
}

export interface BlockedUser {
    blockedUserId: string;
    username: string;
    displayName?: string;
    photoUrl?: string;
    blockedAt: string;
}

export interface BlockedUsersPage {
    blockedUsers: BlockedUser[];
    pagination: Pagination;
}

export interface BlockStatus {
    youBlockedPartner: boolean;
    partnerBlockedYou: boolean;
}

export type FriendRequestAction = 'accept' | 'decline';
