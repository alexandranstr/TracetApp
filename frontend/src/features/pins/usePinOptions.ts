import { useEffect, useState } from 'react';
import { pinsApi } from './api';
import { Tag } from './types';

export function usePinOptions(enabled: boolean) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (!enabled) return;
        let active = true;
        Promise.all([pinsApi.tags().catch(() => [] as Tag[]), pinsApi.categories().catch(() => [] as string[])]).then(
            ([tagList, categoryNames]) => {
                if (!active) return;
                setTags(tagList);
                setCategories(categoryNames);
            }
        );
        return () => {
            active = false;
        };
    }, [enabled]);

    return { tags, categories };
}
