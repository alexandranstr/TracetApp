import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from './config';

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
    body?: unknown;
    authenticated?: boolean;
    timeoutMs?: number;
}

export const UNREACHABLE_MESSAGE = "Couldn't reach the server. Please check your connection and try again.";
export const TIMEOUT_MESSAGE = 'The request took too long. Please try again.';

async function request<T>(method: Method, path: string, { body, authenticated = true, timeoutMs }: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (authenticated) {
        const user = getAuth().currentUser;
        if (!user) throw new ApiError(401, 'You are not signed in.');
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }

    const controller = timeoutMs ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller?.signal,
        });
    } catch {
        throw controller?.signal.aborted ? new ApiError(408, TIMEOUT_MESSAGE) : new ApiError(0, UNREACHABLE_MESSAGE);
    } finally {
        if (timer) clearTimeout(timer);
    }

    const text = await response.text();
    const data = text ? safeJson(text) : undefined;

    if (!response.ok) {
        const message = (data as { message?: string } | undefined)?.message;
        throw new ApiError(response.status, message ?? `Request failed (${response.status}).`);
    }

    return data as T;
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

export const api = {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
    delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

export const query = (params: Record<string, string | number | undefined>) => {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
    return entries.length === 0
        ? ''
        : '?' + entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
};
