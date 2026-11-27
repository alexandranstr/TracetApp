import { api, query } from '../../api/client';
import { CreatePinRequest, MapArea, Pin, PinsPage, PinStatistics, Tag, UpdatePinRequest } from './types';

export const pinsApi = {
    categories: () => api.get<string[]>('/api/pins/categories', { authenticated: false }),
    tags: () => api.get<Tag[]>('/api/tags'),
    nearby: (area: MapArea) => api.get<Pin[]>(`/api/pins/nearby${query({ ...area })}`),
    visible: (page: number, pageSize: number) => api.get<PinsPage>(`/api/pins${query({ page, pageSize })}`),
    mine: (page: number, pageSize: number) => api.get<PinsPage>(`/api/pins/my-pins${query({ page, pageSize })}`),
    shared: (page: number, pageSize: number) => api.get<PinsPage>(`/api/pins/shared-history${query({ page, pageSize })}`),
    statistics: () => api.get<PinStatistics>('/api/pins/statistics'),
    create: (pin: CreatePinRequest) => api.post<Pin>('/api/pins', pin),
    update: (id: number, changes: UpdatePinRequest) => api.put<Pin>(`/api/pins/${id}`, changes),
    toggleVisibility: (id: number) => api.patch<Pin>(`/api/pins/${id}/visibility`),
    remove: (id: number) => api.delete<void>(`/api/pins/${id}`),
};
