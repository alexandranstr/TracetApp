import { getAuth } from '@react-native-firebase/auth';
import { api, ApiError, query, TIMEOUT_MESSAGE, UNREACHABLE_MESSAGE } from './client';

jest.mock('@react-native-firebase/auth', () => ({ getAuth: jest.fn() }));
jest.mock('./config', () => ({ API_BASE_URL: 'http://api.test' }));

const getAuthMock = getAuth as jest.Mock;
const fetchMock = jest.fn();

function respond(status: number, body?: unknown) {
    fetchMock.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
    });
}

beforeEach(() => {
    jest.resetAllMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    getAuthMock.mockReturnValue({ currentUser: { getIdToken: () => Promise.resolve('token-123') } });
});

describe('api client', () => {
    it('sends the login token and returns the JSON body', async () => {
        respond(200, { friends: [] });

        const data = await api.get<{ friends: unknown[] }>('/api/friendships/social-overview');

        expect(data).toEqual({ friends: [] });
        expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/friendships/social-overview', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        }));
    });

    it('sends JSON bodies', async () => {
        respond(200, { success: true });

        await api.post('/api/friendships/request', { receiverId: 'bob' });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe('POST');
        expect(init.headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(init.body)).toEqual({ receiverId: 'bob' });
    });

    it('turns error responses into ApiError with the server message', async () => {
        respond(404, { message: 'User not found.' });

        await expect(api.get('/api/auth/profile')).rejects.toEqual(new ApiError(404, 'User not found.'));
    });

    it('handles empty success responses such as 204', async () => {
        respond(204);

        await expect(api.delete('/api/pins/1')).resolves.toBeUndefined();
    });

    it('fails clearly when nobody is signed in', async () => {
        getAuthMock.mockReturnValue({ currentUser: null });

        await expect(api.get('/api/auth/profile')).rejects.toMatchObject({ status: 401 });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports an unreachable server with a friendly message', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

        await expect(api.get('/api/pins')).rejects.toEqual(new ApiError(0, UNREACHABLE_MESSAGE));
    });

    it('gives up after the timeout', async () => {
        jest.useFakeTimers();
        fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }));

        const pending = api.post('/api/ai/chat', { message: 'hi' }, { timeoutMs: 1000 });
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(1000);

        await expect(pending).rejects.toEqual(new ApiError(408, TIMEOUT_MESSAGE));
        jest.useRealTimers();
    });

    it('can call public endpoints without a token', async () => {
        respond(200, ['Cafe']);

        await api.get('/api/pins/categories', { authenticated: false });

        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });
});

describe('query', () => {
    it('builds an encoded query string and skips empty values', () => {
        expect(query({ q: 'ana maria', page: 2, provider: undefined })).toBe('?q=ana%20maria&page=2');
        expect(query({ q: '' })).toBe('');
    });
});
