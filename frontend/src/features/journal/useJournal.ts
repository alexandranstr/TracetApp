import { useCallback, useEffect, useState } from 'react';
import { Pagination } from '../../api/types';
import { pinsApi } from '../pins/api';
import { Pin, PinStatistics } from '../pins/types';

const PAGE_SIZE = 10;
const FIRST_PAGE: Pagination = {
    currentPage: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
};

export function useJournal(userId?: string | null) {
    const [statistics, setStatistics] = useState<PinStatistics | null>(null);
    const [pins, setPins] = useState<Pin[]>([]);
    const [pagination, setPagination] = useState<Pagination>(FIRST_PAGE);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (page: number) => {
        const [stats, mine] = await Promise.allSettled([pinsApi.statistics(), pinsApi.mine(page, PAGE_SIZE)]);
        if (stats.status === 'fulfilled') setStatistics(stats.value);
        if (mine.status === 'fulfilled') {
            setPins(mine.value.pins);
            setPagination(mine.value.pagination);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load(1);
    }, [load, userId]);

    const goToPage = useCallback(
        (page: number) => {
            if (page >= 1 && page <= pagination.totalPages) load(page);
        },
        [load, pagination.totalPages]
    );

    const replacePin = useCallback(
        (pin: Pin) => setPins((previous) => previous.map((p) => (p.id === pin.id ? pin : p))),
        []
    );

    return { statistics, pins, pagination, loading, goToPage, replacePin };
}
