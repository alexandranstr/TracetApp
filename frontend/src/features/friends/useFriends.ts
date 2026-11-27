import { useCallback, useEffect, useRef, useState } from 'react';
import { friendsApi } from './api';
import { BlockedUser, FriendRequestAction, SocialUser, UserSearchResult } from './types';

const SEARCH_DELAY_MS = 200;

export function useFriends() {
    const [friends, setFriends] = useState<SocialUser[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<SocialUser[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<SocialUser[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const [overview, blocked] = await Promise.all([friendsApi.getOverview(), friendsApi.getBlocked()]);
            const blockedIds = new Set(blocked.blockedUsers.map((u) => u.blockedUserId));
            setFriends(overview.friends.filter((f) => !blockedIds.has(f.id)));
            setIncomingRequests(overview.incomingRequests);
            setOutgoingRequests(overview.outgoingRequests);
            setBlockedUsers(blocked.blockedUsers);
            setError(null);
        } catch (e) {
            setError((e as Error).message);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const run = useCallback(async (action: () => Promise<unknown>) => {
        try {
            await action();
            await refresh();
        } catch (e) {
            setError((e as Error).message);
        }
    }, [refresh]);

    return {
        friends,
        incomingRequests,
        outgoingRequests,
        blockedUsers,
        error,
        refresh,
        sendRequest: (receiverId: string) => run(() => friendsApi.sendRequest(receiverId)),
        respond: (senderId: string, action: FriendRequestAction) => run(() => friendsApi.respond(senderId, action)),
        block: (userId: string) => run(() => friendsApi.block(userId)),
        unblock: (userId: string) => run(() => friendsApi.unblock(userId)),
    };
}

export function useUserSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const search = useCallback((text: string) => {
        setQuery(text);
        if (timer.current) clearTimeout(timer.current);

        if (text.trim().length === 0) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        timer.current = setTimeout(async () => {
            try {
                setResults(await friendsApi.search(text));
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DELAY_MS);
    }, []);

    const markRequested = useCallback((userId: string) => {
        setResults((previous) => previous.map((u) => (u.id === userId ? { ...u, status: 'pending_sent' } : u)));
    }, []);

    return { query, results, isSearching, search, markRequested };
}
