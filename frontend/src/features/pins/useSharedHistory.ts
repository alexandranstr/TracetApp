import { useCallback, useEffect, useState } from 'react';
import { pinsApi } from './api';
import { Pin } from './types';

const PAGE_SIZE = 20;

export function useSharedHistory() {
    const [pins, setPins] = useState<Pin[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (pageNumber: number) => {
        try {
            const result = await pinsApi.shared(pageNumber, PAGE_SIZE);
            setPins((previous) => (pageNumber === 1 ? result.pins : [...previous, ...result.pins]));
            setHasMore(result.pagination.hasNextPage);
            setPage(pageNumber);
        } catch {
            setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        load(1);
    }, [load]);

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        load(page + 1);
    }, [hasMore, load, loadingMore, page]);

    return { pins, loading, loadingMore, loadMore };
}
