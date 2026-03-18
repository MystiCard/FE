import { apiRequest } from '@/utils/api';
import type { PageResponse } from './types';

export interface Permission {
    permisionCode: string;
    permisionName: string;
    description?: string;
    active?: boolean;
}

export const permissionApi = {
    list: async (page = 1, size = 100, active = true): Promise<PageResponse<Permission>> => {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            active: String(active),
        });
        const res = await apiRequest<{ data: PageResponse<Permission> }>(`/permisions?${params.toString()}`, {
            method: 'GET',
        });
        return res.data;
    },
    getByRoleCode: async (roleCode: string, page = 1, size = 100, active = true): Promise<PageResponse<Permission>> => {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            active: String(active),
        });
        const res = await apiRequest<{ data: PageResponse<Permission> }>(
            `/permisions/${roleCode}?${params.toString()}`,
            { method: 'GET' }
        );
        return res.data;
    },
};

