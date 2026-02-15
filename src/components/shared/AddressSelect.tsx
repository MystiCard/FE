import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import provincesData from '../../../province.json';
import wardsData from '../../../ward.json';

/** Chuẩn hóa chuỗi để so sánh tìm kiếm (bỏ dấu, lowercase) */
function normalizeSearch(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();
}

export interface ProvinceItem {
    name: string;
    name_with_type: string;
    code: string;
    type?: string;
    slug?: string;
}

export interface WardItem {
    name: string;
    name_with_type: string;
    path_with_type: string;
    code: string;
    parent_code: string;
    type?: string;
    path?: string;
    slug?: string;
}

const provinces = provincesData as Record<string, ProvinceItem>;
const wards = wardsData as Record<string, WardItem>;

function getProvinceList() {
    return Object.values(provinces).sort((a, b) => a.name_with_type.localeCompare(b.name_with_type));
}

function getWardsByProvinceCode(provinceCode: string): WardItem[] {
    return Object.values(wards)
        .filter((w) => w.parent_code === provinceCode)
        .sort((a, b) => a.name_with_type.localeCompare(b.name_with_type));
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
}

export const AddressSelect: React.FC<AddressSelectProps> = ({
    value = '',
    onChange,
    placeholderProvince = 'Chọn Tỉnh / Thành phố',
    placeholderWard = 'Chọn Xã / Phường',
    className = '',
    showDetailInput = true,
    disabled = false,
    required = false,
}) => {
    const [provinceCode, setProvinceCode] = useState<string>('');
    const [wardCode, setWardCode] = useState<string>('');
    const [detail, setDetail] = useState<string>('');
    const [provinceSearch, setProvinceSearch] = useState('');
    const [wardSearch, setWardSearch] = useState('');
    const [openProvince, setOpenProvince] = useState(false);
    const [openWard, setOpenWard] = useState(false);
    const provinceRef = useRef<HTMLDivElement>(null);
    const wardRef = useRef<HTMLDivElement>(null);

    const provinceList = useMemo(() => getProvinceList(), []);
    const wardList = useMemo(
        () => (provinceCode ? getWardsByProvinceCode(provinceCode) : []),
        [provinceCode]
    );

    const filteredProvinces = useMemo(() => {
        if (!provinceSearch.trim()) return provinceList;
        const q = normalizeSearch(provinceSearch);
        return provinceList.filter(
            (p) => normalizeSearch(p.name_with_type).includes(q) || normalizeSearch(p.name).includes(q)
        );
    }, [provinceList, provinceSearch]);

    const filteredWards = useMemo(() => {
        if (!wardSearch.trim()) return wardList;
        const q = normalizeSearch(wardSearch);
        return wardList.filter(
            (w) => normalizeSearch(w.name_with_type).includes(q) || normalizeSearch(w.name).includes(q)
        );
    }, [wardList, wardSearch]);

    useEffect(() => {
        const onOutside = (e: MouseEvent) => {
            if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) setOpenProvince(false);
            if (wardRef.current && !wardRef.current.contains(e.target as Node)) setOpenWard(false);
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, []);

    const handleProvinceChange = (code: string) => {
        setProvinceCode(code);
        setWardCode('');
        setProvinceSearch('');
        setOpenProvince(false);
        if (!code) {
            onChange('');
            return;
        }
        const p = provinces[code];
        const addr = p ? (showDetailInput && detail.trim() ? `${detail.trim()}, ${p.name_with_type}` : p.name_with_type) : '';
        onChange(addr);
    };

    const handleWardChange = (code: string) => {
        setWardCode(code);
        setWardSearch('');
        setOpenWard(false);
        const w = wards[code];
        if (w) {
            const addr = showDetailInput && detail.trim()
                ? `${detail.trim()}, ${w.path_with_type}`
                : w.path_with_type;
            onChange(addr);
        } else {
            const p = provinceCode ? provinces[provinceCode] : null;
            const addr = p ? (showDetailInput && detail.trim() ? `${detail.trim()}, ${p.name_with_type}` : p.name_with_type) : '';
            onChange(addr);
        }
    };

    const handleDetailChange = (v: string) => {
        setDetail(v);
        if (wardCode && wards[wardCode]) {
            const addr = v.trim() ? `${v.trim()}, ${wards[wardCode].path_with_type}` : wards[wardCode].path_with_type;
            onChange(addr);
        } else if (provinceCode && provinces[provinceCode]) {
            const addr = v.trim() ? `${v.trim()}, ${provinces[provinceCode].name_with_type}` : provinces[provinceCode].name_with_type;
            onChange(addr);
        } else {
            onChange(v.trim());
        }
    };

    const selectClass =
        'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 disabled:opacity-50 ' +
        (className || '');

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
                {required && <input type="hidden" name="provinceCode" value={provinceCode} required={required} readOnly />}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && setOpenProvince((v) => !v)}
                        disabled={disabled}
                        className={`${selectClass} flex items-center justify-between gap-2 text-left min-h-[40px]`}
                    >
                        <span className={provinceCode ? '' : 'text-muted-foreground'}>
                            {provinceCode ? provinces[provinceCode]?.name_with_type : placeholderProvince}
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
                                    onClick={() => handleProvinceChange('')}
                                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 text-muted-foreground"
                                >
                                    -- Bỏ chọn --
                                </button>
                                {filteredProvinces.map((p) => (
                                    <button
                                        key={p.code}
                                        type="button"
                                        onClick={() => handleProvinceChange(p.code)}
                                        className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 ${provinceCode === p.code ? 'bg-primary-500/20 text-primary-300' : ''}`}
                                    >
                                        {p.name_with_type}
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
            <div ref={wardRef}>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Xã / Phường
                </label>
                {required && <input type="hidden" name="wardCode" value={wardCode} required={required} readOnly />}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && provinceCode && setOpenWard((v) => !v)}
                        disabled={disabled || !provinceCode}
                        className={`${selectClass} flex items-center justify-between gap-2 text-left min-h-[40px]`}
                    >
                        <span className={wardCode ? '' : 'text-muted-foreground'}>
                            {wardCode ? wards[wardCode]?.name_with_type : placeholderWard}
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
                                        key={w.code}
                                        type="button"
                                        onClick={() => handleWardChange(w.code)}
                                        className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-white/10 ${wardCode === w.code ? 'bg-primary-500/20 text-primary-300' : ''}`}
                                    >
                                        {w.name_with_type}
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
