import { apiRequest } from '@/utils/api';
import type { PageResponse } from './types';

export interface Permission {
    permisionCode: string;
    permisionName: string;
    description?: string;
}

export interface Role {
    roleCode: string;
    roleName: string;
    description?: string;
    permisionResponse?: Permission[];
}

export interface RoleRequestPayload {
    roleCode: string;
    roleName: string;
    description?: string;
}

export const roleApi = {
    list: async (page = 1, size = 50, active = true): Promise<PageResponse<Role>> => {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            active: String(active),
        });
        const res = await apiRequest<{ data: PageResponse<Role> }>(`/roles?${params.toString()}`, {
            method: 'GET',
        });
        return res.data;
    },

    getByCode: async (code: string): Promise<Role> => {
        const res = await apiRequest<{ data: Role }>(`/roles/${code}`, { method: 'GET' });
        return res.data;
    },

    getByUserId: async (userId: string, page = 1, size = 50, active = true): Promise<PageResponse<Role>> => {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            active: String(active),
        });
        const res = await apiRequest<{ data: PageResponse<Role> }>(
            `/roles/user/${userId}?${params.toString()}`,
            { method: 'GET' }
        );
        return res.data;
    },

    addRole: async (payload: RoleRequestPayload): Promise<Role> => {
        const res = await apiRequest<{ data: Role }>(`/roles/add`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.data;
    },

    deleteByCode: async (code: string): Promise<string> => {
        const res = await apiRequest<{ data: string }>(`/roles/${code}`, { method: 'DELETE' });
        return res.data;
    },

    addPermissions: async (roleCode: string, permisionCodes: string[]): Promise<Role> => {
        const res = await apiRequest<{ data: Role }>(`/roles/add-permision`, {
            method: 'POST',
            body: JSON.stringify({ roleCode, permisionCode: permisionCodes }),
        });
        return res.data;
    },

    removePermissions: async (roleCode: string, permisionCodes: string[]): Promise<Role> => {
        const res = await apiRequest<{ data: Role }>(`/roles/remove-permision`, {
            method: 'DELETE',
            body: JSON.stringify({ roleCode, permisionCode: permisionCodes }),
        });
        return res.data;
    },

    active: async (code: string): Promise<string> => {
        const res = await apiRequest<{ data: string }>(`/roles/active/${code}`, {
            method: 'POST',
        });
        return res.data;
    },
};

