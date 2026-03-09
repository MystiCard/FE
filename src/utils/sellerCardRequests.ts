export type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';

export interface SellerCardRequestDraft {
    name: string;
    rarity: CardRarity;
    categoryId: string;
    basePrice: number;
    /** Tên set/bộ thẻ (FE-only, để Admin tham khảo) */
    setName?: string | null;
    imageUrl?: string | null;
    note?: string | null;
}

export interface SellerCardRequest extends SellerCardRequestDraft {
    requestId: string;
    createdAt: string; // ISO
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    decidedAt?: string;
    decidedNote?: string | null;
    createdBy?: {
        userEmail?: string;
        userName?: string;
    };
}

const STORAGE_KEY = 'mysticard:seller-card-requests:v1';

function safeParse(json: string | null): SellerCardRequest[] {
    if (!json) return [];
    try {
        const data = JSON.parse(json);
        return Array.isArray(data) ? (data as SellerCardRequest[]) : [];
    } catch {
        return [];
    }
}

export function listSellerCardRequests(): SellerCardRequest[] {
    return safeParse(localStorage.getItem(STORAGE_KEY))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function listSellerCardRequestsForUser(email?: string | null): SellerCardRequest[] {
    const all = listSellerCardRequests();
    if (!email) return all;
    return all.filter((r) => r.createdBy?.userEmail === email);
}

export function createSellerCardRequest(draft: SellerCardRequestDraft, createdBy?: SellerCardRequest['createdBy']): SellerCardRequest {
    const now = new Date().toISOString();
    const req: SellerCardRequest = {
        requestId: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        createdAt: now,
        status: 'PENDING',
        createdBy,
        ...draft,
    };

    const all = listSellerCardRequests();
    all.unshift(req);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return req;
}

export function markSellerCardRequestApproved(requestId: string, note?: string | null): void {
    const all = listSellerCardRequests().map((r) =>
        r.requestId === requestId
            ? { ...r, status: 'APPROVED' as const, decidedAt: new Date().toISOString(), decidedNote: note ?? null }
            : r
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function markSellerCardRequestRejected(requestId: string, note?: string | null): void {
    const all = listSellerCardRequests().map((r) =>
        r.requestId === requestId
            ? { ...r, status: 'REJECTED' as const, decidedAt: new Date().toISOString(), decidedNote: note ?? null }
            : r
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

