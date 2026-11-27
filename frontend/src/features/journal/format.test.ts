import { fullDate, monthName } from './format';

describe('journal date formatting', () => {
    it('names months from 1 to 12 and nothing else', () => {
        expect(monthName(1)).toBe('Jan');
        expect(monthName(12)).toBe('Dec');
        expect(monthName(13)).toBe('');
    });

    it('writes a full date in English', () => {
        expect(fullDate('2026-11-27T12:00:00Z')).toBe('November 27, 2026');
    });
});
