import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import { shipmentApi, GhnProvince, GhnDistrict, GhnWard } from '@/utils/api';

/** Chuẩn hóa chuỗi để so sánh tìm kiếm (bỏ dấu, lowercase) */
function normalizeSearch(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();
}

interface AddressSelectProps {
    value?: string;
    onChange: (address: string) => void;
    placeholderProvince?: string;
    placeholderWard?: string;
    className?: string;
    /** Cho phép nhập thêm địa chỉ chi tiết (số nhà, đường) */
    showDetailInput?: boolean;
    disabled?: boolean;
    /** Bắt buộc chọn đủ Tỉnh + Xã/Phường (dùng trong form đăng ký) */
    required?: boolean;
    /** Nhận lại mã GHN khi chọn (để lưu districtId/wardId về BE) */
    onCodesChange?: (codes: { provinceId?: number; districtId?: number; wardCode?: string }) => void;
}

export const AddressSelect: React.FC<AddressSelectProps> = ({
    value: _value = '',
    onChange,
    placeholderProvince = 'Chọn Tỉnh / Thành phố',
    placeholderWard = 'Chọn Xã / Phường',
    className = '',
    showDetailInput = true,
    disabled = false,
    required = false,
    onCodesChange,
}) => {
    const [provinceId, setProvinceId] = useState<number | null>(null);
    const [districtId, setDistrictId] = useState<number | null>(null);
    const [wardCode, setWardCode] = useState<string>('');
    const [detail, setDetail] = useState<string>('');
    const [provinceSearch, setProvinceSearch] = useState('');
    const [districtSearch, setDistrictSearch] = useState('');
    const [wardSearch, setWardSearch] = useState('');
    const [openProvince, setOpenProvince] = useState(false);
    const [openDistrict, setOpenDistrict] = useState(false);
    const [openWard, setOpenWard] = useState(false);
    const provinceRef = useRef<HTMLDivElement>(null);
    const districtRef = useRef<HTMLDivElement>(null);
    const wardRef = useRef<HTMLDivElement>(null);

    const [provinces, setProvinces] = useState<GhnProvince[]>([]);
    const [districts, setDistricts] = useState<GhnDistrict[]>([]);
    const [wards, setWards] = useState<GhnWard[]>([]);

    // Load provinces từ backend (GHN)
    useEffect(() => {
        const loadProvinces = async () => {
            try {
                const data = await shipmentApi.getProvinces();
                setProvinces(Array.isArray(data) ? data : []);
            } catch {
                setProvinces([]);
            }
        };
        loadProvinces();
    }, []);

    // Khi chọn province → load districts
    useEffect(() => {
        if (!provinceId) {
            setDistricts([]);
            setWards([]);
            setDistrictId(null);
            setWardCode('');
            return;
        }
        const loadDistricts = async () => {
            try {
                const data = await shipmentApi.getDistricts(provinceId);
                setDistricts(Array.isArray(data) ? data : []);
            } catch {
                setDistricts([]);
            }
        };
        loadDistricts();
    }, [provinceId]);

    // Khi chọn district → load wards
    useEffect(() => {
        if (!districtId) {
            setWards([]);
            setWardCode('');
            return;
        }
        const loadWards = async () => {
            try {
                const data = await shipmentApi.getWards(districtId);
                setWards(Array.isArray(data) ? data : []);
            } catch {
                setWards([]);
            }
        };
        loadWards();
    }, [districtId]);

    const filteredProvinces = useMemo(() => {
        if (!provinceSearch.trim()) return provinces;
        const q = normalizeSearch(provinceSearch);
        return provinces.filter(
            (p) => normalizeSearch(p.ProvinceName).includes(q)
        );
    }, [provinces, provinceSearch]);

    const filteredDistricts = useMemo(() => {
        if (!districtSearch.trim()) return districts;
        const q = normalizeSearch(districtSearch);
        return districts.filter((d) => normalizeSearch(d.DistrictName).includes(q));
    }, [districts, districtSearch]);

    const filteredWards = useMemo(() => {
        if (!wardSearch.trim()) return wards;
        const q = normalizeSearch(wardSearch);
        return wards.filter((w) => normalizeSearch(w.WardName).includes(q));
    }, [wards, wardSearch]);

    useEffect(() => {
        const onOutside = (e: MouseEvent) => {
            if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) setOpenProvince(false);
            if (districtRef.current && !districtRef.current.contains(e.target as Node)) setOpenDistrict(false);
            if (wardRef.current && !wardRef.current.contains(e.target as Node)) setOpenWard(false);
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, []);

    const buildAddress = (
        currentDetail: string,
        currentProvinceId: number | null,
        currentDistrictId: number | null,
        currentWardCode: string
    ) => {
        const parts: string[] = [];
        const d = currentDetail.trim();
        if (d) parts.push(d);

        const ward = wards.find((w) => w.WardCode === currentWardCode);
        const district = districts.find((dt) => dt.DistrictID === currentDistrictId);
        const province = provinces.find((p) => p.ProvinceID === currentProvinceId);

        if (ward) parts.push(ward.WardName);
        if (district) parts.push(district.DistrictName);
        if (province) parts.push(province.ProvinceName);

        return parts.join(', ');
    };

    const handleProvinceChange = (id: number | null) => {
        setProvinceId(id);
        setDistrictId(null);
        setWardCode('');
        setProvinceSearch('');
        setDistrictSearch('');
        setWardSearch('');
        setOpenProvince(false);

        if (onCodesChange) {
            onCodesChange({ provinceId: id ?? undefined, districtId: undefined, wardCode: undefined });
        }

        if (!id) {
            onChange(detail.trim());
            return;
        }

        const addr = buildAddress(detail, id, null, '');
        onChange(addr);
    };

    const handleDistrictChange = (id: number | null) => {
        setDistrictId(id);
        setWardCode('');
        setDistrictSearch('');
        setWardSearch('');
        setOpenDistrict(false);

        if (onCodesChange) {
            onCodesChange({
                provinceId: provinceId ?? undefined,
                districtId: id ?? undefined,
                wardCode: undefined,
            });
        }

        const addr = buildAddress(detail, provinceId, id, '');
        onChange(addr);
    };

    const handleWardChange = (code: string) => {
        setWardCode(code);
        setWardSearch('');
        setOpenWard(false);
        const addr = buildAddress(detail, provinceId, districtId, code);
        onChange(addr);

        if (onCodesChange) {
            onCodesChange({
                provinceId: provinceId ?? undefined,
                districtId: districtId ?? undefined,
                wardCode: code || undefined,
            });
        }
    };

    const handleDetailChange = (v: string) => {
        setDetail(v);
        const addr = buildAddress(v, provinceId, districtId, wardCode);
        onChange(addr);
    };

    const selectClass =
        'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 disabled:opacity-50 ' +
        (className || '');

    const enforceCodes = required;

    return (
        <div className="space-y-3">
            {showDetailInput && (
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Số nhà, đường (tùy chọn)
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={detail}
                            onChange={(e) => handleDetailChange(e.target.value)}
                            placeholder="VD: Số 123, Đường ABC"
                            disabled={disabled}
                            className={`pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 w-full disabled:opacity-50 ${className}`}
                        />
                    </div>
                </div>
            )}
            <div ref={provinceRef}>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Tỉnh / Thành phố
                </label>
                {enforceCodes && (
                    <input
                        type="hidden"
                        name="provinceId"
                        value={provinceId ?? ''}
                        required={enforceCodes}
                        readOnly
                    />
                )}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && setOpenProvince((v) => !v)}
                        disabled={disabled}
                        className={`${selectClass} flex items-center justify-between gap-2 text-left min-h-[40px]`}
                    >
                        <span className={provinceId ? '' : 'text-muted-foreground'}>
                            {provinceId
                                ? provinces.find((p) => p.ProvinceID === provinceId)?.ProvinceName
                                : placeholderProvince}
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openProvince ? 'rotate-180' : ''}`} />
                    </button>
                    {openProvince && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#1a0a2e] shadow-xl max-h-64 flex flex-col">
                            <div className="p-2 border-b border-white/10 sticky top-0 bg-[#1a0a2e]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={provinceSearch}
                                        onChange={(e) => setProvinceSearch(e.target.value)}
                                        placeholder="Tìm tỉnh, thành phố..."
                                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-primary-500"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="overflow-y-auto p-1 max-h-52">
                                <button
                                    type="button"
                                    onClick={() => handleProvinceChange(null)}
                                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 text-muted-foreground"
                                >
                                    -- Bỏ chọn --
                                </button>
                                {filteredProvinces.map((p) => (
                                    <button
                                        key={p.ProvinceID}
                                        type="button"
                                        onClick={() => handleProvinceChange(p.ProvinceID)}
                                        className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 ${
                                            provinceId === p.ProvinceID
                                                ? 'bg-primary-500/20 text-primary-300'
                                                : ''
                                        }`}
                                    >
                                        {p.ProvinceName}
                                    </button>
                                ))}
                                {filteredProvinces.length === 0 && (
                                    <p className="px-3 py-4 text-sm text-muted-foreground">Không tìm thấy</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div ref={districtRef}>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Quận / Huyện
                </label>
                {enforceCodes && (
                    <input
                        type="hidden"
                        name="districtId"
                        value={districtId ?? ''}
                        required={enforceCodes}
                        readOnly
                    />
                )}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && provinceId && setOpenDistrict((v) => !v)}
                        disabled={disabled || !provinceId}
                        className={`${selectClass} flex items-center justify-between gap-2 text-left min-h-[40px]`}
                    >
                        <span className={districtId ? '' : 'text-muted-foreground'}>
                            {districtId
                                ? districts.find((d) => d.DistrictID === districtId)?.DistrictName
                                : provinceId
                                ? 'Chọn Quận / Huyện'
                                : 'Chọn Tỉnh / Thành phố trước'}
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDistrict ? 'rotate-180' : ''}`} />
                    </button>
                    {openDistrict && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#1a0a2e] shadow-xl max-h-64 flex flex-col">
                            <div className="p-2 border-b border-white/10 sticky top-0 bg-[#1a0a2e]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={districtSearch}
                                        onChange={(e) => setDistrictSearch(e.target.value)}
                                        placeholder="Tìm quận, huyện..."
                                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-primary-500"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="overflow-y-auto p-1 max-h-52">
                                <button
                                    type="button"
                                    onClick={() => handleDistrictChange(null)}
                                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 text-muted-foreground"
                                >
                                    -- Bỏ chọn --
                                </button>
                                {filteredDistricts.map((d) => (
                                    <button
                                        key={d.DistrictID}
                                        type="button"
                                        onClick={() => handleDistrictChange(d.DistrictID)}
                                        className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 ${
                                            districtId === d.DistrictID
                                                ? 'bg-primary-500/20 text-primary-300'
                                                : ''
                                        }`}
                                    >
                                        {d.DistrictName}
                                    </button>
                                ))}
                                {filteredDistricts.length === 0 && (
                                    <p className="px-3 py-4 text-sm text-muted-foreground">Không tìm thấy</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div ref={wardRef}>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Xã / Phường
                </label>
                {enforceCodes && (
                    <input
                        type="hidden"
                        name="wardCode"
                        value={wardCode}
                        required={enforceCodes}
                        readOnly
                    />
                )}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && districtId && setOpenWard((v) => !v)}
                        disabled={disabled || !districtId}
                        className={`${selectClass} flex items-center justify-between gap-2 text-left min-h-[40px]`}
                    >
                        <span className={wardCode ? '' : 'text-muted-foreground'}>
                            {wardCode
                                ? wards.find((w) => w.WardCode === wardCode)?.WardName
                                : districtId
                                ? placeholderWard
                                : 'Chọn Quận / Huyện trước'}
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openWard ? 'rotate-180' : ''}`} />
                    </button>
                    {openWard && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#1a0a2e] shadow-xl max-h-64 flex flex-col">
                            <div className="p-2 border-b border-white/10 sticky top-0 bg-[#1a0a2e]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={wardSearch}
                                        onChange={(e) => setWardSearch(e.target.value)}
                                        placeholder="Tìm xã, phường..."
                                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-primary-500"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="overflow-y-auto p-1 max-h-52">
                                <button
                                    type="button"
                                    onClick={() => handleWardChange('')}
                                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 text-muted-foreground"
                                >
                                    -- Bỏ chọn --
                                </button>
                                {filteredWards.map((w) => (
                                    <button
                                        key={w.WardCode}
                                        type="button"
                                        onClick={() => handleWardChange(w.WardCode)}
                                        className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 ${wardCode === w.WardCode ? 'bg-primary-500/20 text-primary-300' : ''}`}
                                    >
                                        {w.WardName}
                                    </button>
                                ))}
                                {filteredWards.length === 0 && (
                                    <p className="px-3 py-4 text-sm text-muted-foreground">Không tìm thấy</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
