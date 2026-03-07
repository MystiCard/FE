/**
 * API danh sách ngân hàng Việt Nam (VietQR) - dùng cho dropdown thêm tài khoản rút tiền.
 * Nguồn: https://api.vietqr.io/v2/banks
 * Chỉ lấy ngân hàng (loại trừ ví điện tử) vì chỉ hỗ trợ rút tiền về ngân hàng.
 */

const VIETQR_BANKS_URL = 'https://api.vietqr.io/v2/banks';

/** Mã các ví điện tử / dịch vụ không phải ngân hàng - không dùng cho rút tiền. */
const EWALLET_OR_NONBANK_CODES = new Set([
    'momo', 'VTLMONEY', 'VNPTMONEY', 'CAKE', 'Ubank', 'TIMO', 'PVDB', 'MAFC', 'Vikki', 'VBSP',
]);

export interface VietQrBank {
    id: number;
    name: string;
    code: string;
    bin: string;
    shortName: string;
    logo: string;
    transferSupported: number;
    lookupSupported: number;
}

interface VietQrBanksResponse {
    code: string;
    desc: string;
    data: VietQrBank[];
}

let cachedBanks: VietQrBank[] | null = null;

/**
 * Lấy danh sách ngân hàng từ VietQR (cache trong session).
 * Chỉ trả về ngân hàng, loại trừ ví điện tử (MoMo, ViettelMoney, ...) vì chỉ rút tiền về ngân hàng.
 */
export async function getVietQrBanks(): Promise<VietQrBank[]> {
    if (cachedBanks && cachedBanks.length > 0) {
        return cachedBanks;
    }
    const res = await fetch(VIETQR_BANKS_URL);
    if (!res.ok) {
        throw new Error('Không tải được danh sách ngân hàng');
    }
    const json: VietQrBanksResponse = await res.json();
    if (json.code !== '00' || !Array.isArray(json.data)) {
        throw new Error(json.desc || 'Dữ liệu ngân hàng không hợp lệ');
    }
    cachedBanks = json.data.filter((b) => !EWALLET_OR_NONBANK_CODES.has(b.code));
    return cachedBanks;
}
