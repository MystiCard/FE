import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Package, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { categoryApi, Category, cardRequiredApi } from '@/utils/api';

type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';

const formatRarity = (rarity: string) =>
    rarity
        ? rarity
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
        : '';

export const SellerCardRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCats, setLoadingCats] = useState(true);
    const [error, setError] = useState('');

    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get('q') || '';

    const [name, setName] = useState(q);
    const [rarity, setRarity] = useState<CardRarity>('COMMON');
    const [categoryId, setCategoryId] = useState('');
    const [cardSetName, setCardSetName] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoadingCats(true);
        categoryApi
            .getAllCategories()
            .then((data) => {
                if (cancelled) return;
                setCategories(Array.isArray(data) ? data : []);
                setCategoryId((data?.[0]?.categoryId as string) ?? '');
            })
            .catch(() => {
                if (cancelled) return;
                setCategories([]);
            })
            .finally(() => {
                if (cancelled) return;
                setLoadingCats(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const RARITIES = useMemo(
        () => ['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'SUPER_RARE', 'SECRET_RARE'] as const,
        []
    );

    const handleSubmit = async () => {
        setError('');
        const n = name.trim();
        if (!n) return setError('Vui lòng nhập tên thẻ.');
        if (!categoryId) return setError('Vui lòng chọn danh mục.');

        const basePriceNum = parseFloat(basePrice.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.'));
        if (!Number.isFinite(basePriceNum) || basePriceNum <= 0) {
            return setError('Giá base phải là số dương hợp lệ.');
        }

        setSubmitting(true);
        try {
            const chosenCategory = categories.find((c) => c.categoryId === categoryId);
            await cardRequiredApi.requireNewCard({
                cardName: n,
                rate: rarity,
                basePrice: basePriceNum,
                imageUrl: imageUrl.trim() || null,
                // BE: nếu categoryId null hoặc không tồn tại, sẽ dùng category (string) để tạo cate mới
                category: cardSetName.trim() || chosenCategory?.categoryName || 'UNKNOWN',
                categoryId,
            });
            navigate('/post-listing?requestSent=1');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể gửi yêu cầu.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen py-6 px-4">
            <div className="max-w-3xl mx-auto space-y-4">
                <Link to="/post-listing" className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Về trang đăng bán
                </Link>

                <Card className="glass-card-strong">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary-400" />
                            Yêu cầu Admin thêm thẻ mới
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            Theo flow: bạn gửi yêu cầu → Admin duyệt & thêm thẻ → bạn quay lại để đăng bán.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">Tên thẻ *</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                placeholder="VD: Pikachu..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Độ hiếm *</label>
                                <select
                                    value={rarity}
                                    onChange={(e) => setRarity(e.target.value as CardRarity)}
                                    className="w-full px-4 py-2 rounded-lg bg-black/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                >
                                    {RARITIES.map((r) => (
                                        <option key={r} value={r}>
                                            {formatRarity(r)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Giá base (VNĐ) *</label>
                                <input
                                    value={basePrice}
                                    onChange={(e) => setBasePrice(e.target.value)}
                                    inputMode="numeric"
                                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    placeholder="100000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Set / Bộ thẻ (tùy chọn)</label>
                            <input
                                value={cardSetName}
                                onChange={(e) => setCardSetName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                placeholder="VD: Base Set, Jungle..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Danh mục *</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                disabled={loadingCats}
                                className="w-full px-4 py-2 rounded-lg bg-black/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-70"
                            >
                                {categories.map((c) => (
                                    <option key={c.categoryId} value={c.categoryId}>
                                        {c.categoryName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Ảnh (URL) (tùy chọn)</label>
                            <input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Ghi chú (tùy chọn)</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                placeholder="Ví dụ: link tham khảo, set, mã thẻ..."
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
                                <Send className="h-4 w-4" />
                                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/post-listing')}>
                                Hủy
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

