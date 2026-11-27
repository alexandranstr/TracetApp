import { resolveImageUri } from '../../shared/imageUpload';
import { Pin } from './types';

export const photoUrls = (pin: Pick<Pin, 'photoUrlsJson'>): string[] => {
    try {
        const parsed = JSON.parse(pin.photoUrlsJson || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const resolvedPhotoUris = (pin: Pick<Pin, 'photoUrlsJson'>): string[] =>
    photoUrls(pin)
        .map((url) => resolveImageUri(url))
        .filter((uri): uri is string => uri !== null);
