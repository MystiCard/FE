import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Star, Package, MessageSquare } from 'lucide-react';
import {
    userApi,
    UserProfile,
    feedbackApi,
    FeedbackResponse,
    listSellerApi,
    ListSellerResponse,
    getCardImageUrl,
    getFullImageUrl,
} from '@/utils/api';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

export const SellerProfilePage: React.FC = () => {
    const { sellerId } = useParams<{ sellerId: string }>();

    const [seller, setSeller] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'listings' | 'feedback'>('listings');

    // Listings
    const [listings, setListings] = useState<ListSellerResponse[]>([]);
    const [listingsPage, setListingsPage] = useState(1);
    const [listingsTotalPages, setListingsTotalPages] = useState(0);
    const [listingsTotalElements, setListingsTotalElements] = useState(0);
    const [listingsLoading, setListingsLoading] = useState(false);

    // Feedback
    const [feedbackList, setFeedbackList] = useState<FeedbackResponse[]>([]);
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [feedbackTotalPages, setFeedbackTotalPages] = useState(0);
    const [feedbackTotalElements, setFeedbackTotalElements] = useState(0);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackAvgRating, setFeedbackAvgRating] = useState(0);

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (!sellerId) return;
        setLoading(true);
        userApi
            .getUserById(sellerId)
            .then((data) => setSeller(data))
            .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được thông tin người bán'))
            .finally(() => setLoading(false));
    }, [sellerId]);

    useEffect(() => {
        if (!sellerId) return;
        fetchFeedback(1);
    }, [sellerId]);

    const fetchSellerListings = async (page: number) => {
        if (!sellerId) return;
        setListingsLoading(true);
        try {
            const res = await listSellerApi.getSellerListings(sellerId, page, 8);
            setListings(res.content ?? []);
            setListingsTotalPages(res.totalPages ?? 0);
            setListingsTotalElements(res.totalElements ?? 0);
        } catch {
            setListings([]);
        } finally {
            setListingsLoading(false);
        }
    };

    useEffect(() => {
        if (!sellerId) return;
        fetchSellerListings(1);
    }, [sellerId]);

    const fetchFeedback = async (page: number) => {
        if (!sellerId) return;
        setFeedbackLoading(true);
        try {
            const res = await feedbackApi.getByUser(sellerId, page, 5);
            setFeedbackList(res.content ?? []);
            setFeedbackTotalPages(res.totalPages ?? 0);
            setFeedbackTotalElements(res.totalElements ?? 0);
            if (page === 1 && (res.content ?? []).length > 0) {
                const sum = (res.content ?? []).reduce((s, f) => s + (f.rating ?? 0), 0);
                setFeedbackAvgRating(res.totalElements > 0 ? sum / (res.content ?? []).length : 0);
            }
        } catch {
            setFeedbackList([]);
        } finally {
            setFeedbackLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto animate-spin" />
            </div>
        );
    }

    if (error || !seller) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error || 'Không tìm thấy người bán'}</div>
                    <Button onClick={() => window.history.back()}>Quay lại</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            {/* Header */}
            <div className="relative mb-8">
                <div className="h-36 md:h-48 rounded-b-3xl relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-900/40 to-primary-700/20 rounded-b-3xl" />
                </div>

                <div className="px-4 -mt-14 relative flex flex-col md:flex-row items-end md:items-center gap-6">
                    <div className="w-28 h-28 rounded-full border-4 border-[#0B0112] bg-[#1a0a2e] flex items-center justify-center overflow-hidden">
                        {seller.avatarUrl ? (
                            <img src={seller.avatarUrl} alt={seller.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-primary-400">
                                {seller.name?.charAt(0).toUpperCase() || 'S'}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-white">{seller.name}</h1>
                            {feedbackTotalElements > 0 && (
                                <span className="flex items-center gap-1 text-sm text-yellow-400">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    {feedbackAvgRating.toFixed(1)}
                                    <span className="text-muted-foreground">({feedbackTotalElements} đánh giá)</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#FFF9C4] uppercase tracking-wider mb-1">Đang bán</div>
                            <div className="text-2xl font-bold text-blue-400">{listingsTotalElements}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#E8F5E9] uppercase tracking-wider mb-1">Đánh giá</div>
                            <div className="text-2xl font-bold text-green-400">{feedbackTotalElements}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('listings')}
                        className={`py-2 text-sm font-medium rounded-md flex items-center justify-center gap-1.5 ${activeTab === 'listings'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        Đang bán ({listingsTotalElements})
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`py-2 text-sm font-medium rounded-md flex items-center justify-center gap-1.5 ${activeTab === 'feedback'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Đánh giá ({feedbackTotalElements})
                    </button>
                </div>

                {/* Tab: Listings */}
                {activeTab === 'listings' && (
                    <div>
                        {listingsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="rounded-full h-10 w-10 border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
                            </div>
                        ) : listings.length === 0 ? (
                            <Card className="glass-card p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Package className="w-8 h-8 text-yellow-400" />
                                </div>
                                <p className="text-muted-foreground">Người bán chưa có tin đăng nào</p>
                            </Card>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {listings.map((item) => {
                                        const cardImg = item.cardResponse ? getCardImageUrl(item.cardResponse) : '';
                                        const cardName = item.cardResponse?.name || 'Thẻ';
                                        return (
                                            <Card
                                                key={item.listSellerId}
                                                className="overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                <div className="relative aspect-[2.5/3.5] rounded-t-lg overflow-hidden bg-white/5">
                                                    <img
                                                        src={cardImg || PLACEHOLDER_IMG}
                                                        alt={cardName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = PLACEHOLDER_IMG;
                                                        }}
                                                    />
                                                </div>
                                                <CardContent className="p-3">
                                                    <h4 className="font-semibold text-sm line-clamp-2">{cardName}</h4>
                                                    <p className="text-sm font-bold text-yellow-400 mt-1">
                                                        {Number(item.price).toLocaleString('vi-VN')} đ
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">SL: {item.quantity}</p>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {listingsTotalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={listingsPage <= 1}
                                            onClick={() => {
                                                const p = listingsPage - 1;
                                                setListingsPage(p);
                                                fetchSellerListings(p);
                                            }}
                                        >
                                            ‹
                                        </Button>
                                        {Array.from({ length: listingsTotalPages }, (_, i) => i + 1).map((p) => (
                                            <Button
                                                key={p}
                                                size="sm"
                                                variant={p === listingsPage ? 'default' : 'outline'}
                                                className={p === listingsPage ? 'bg-primary-500' : ''}
                                                onClick={() => {
                                                    setListingsPage(p);
                                                    fetchSellerListings(p);
                                                }}
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={listingsPage >= listingsTotalPages}
                                            onClick={() => {
                                                const p = listingsPage + 1;
                                                setListingsPage(p);
                                                fetchSellerListings(p);
                                            }}
                                        >
                                            ›
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Tab: Feedback */}
                {activeTab === 'feedback' && (
                    <div>
                        {feedbackLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="rounded-full h-10 w-10 border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
                            </div>
                        ) : feedbackList.length === 0 ? (
                            <Card className="glass-card p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Star className="w-8 h-8 text-yellow-400" />
                                </div>
                                <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                            </Card>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {feedbackList.map((fb) => {
                                        const reviewer = fb.userResponse;
                                        const card = fb.cardResponse;
                                        const images = fb.imageResponses ?? [];
                                        const cardImg = card ? getCardImageUrl(card) : '';
                                        return (
                                            <Card key={fb.feedBackId} className="glass-card p-4">
                                                <div className="flex gap-3">
                                                    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                                        {reviewer?.avatarUrl ? (
                                                            <img src={reviewer.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm text-white">
                                                                {reviewer?.name || 'Ẩn danh'}
                                                            </span>
                                                            <span className="flex items-center gap-0.5">
                                                                {[1, 2, 3, 4, 5].map((i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-3.5 w-3.5 ${i <= fb.rating
                                                                            ? 'fill-yellow-400 text-yellow-400'
                                                                            : 'text-white/20'
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                                                            </span>
                                                            {card && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                    ·
                                                                    {cardImg && (
                                                                        <button
                                                                            type="button"
                                                                            className="shrink-0 rounded overflow-hidden border border-white/10 hover:border-primary-400/50 transition-colors focus:outline-none"
                                                                            onClick={() => setPreviewImage(cardImg)}
                                                                        >
                                                                            <img src={cardImg} alt={card.name} className="w-6 h-8 object-cover" />
                                                                        </button>
                                                                    )}
                                                                    <span className="line-clamp-1">{card.name}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        {fb.comment && (
                                                            <p className="text-sm text-muted-foreground mt-2">{fb.comment}</p>
                                                        )}
                                                        {images.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {images.map((img, idx) => {
                                                                    const rawUrl = img.imageUrl || img.url || '';
                                                                    const fullUrl = getFullImageUrl(rawUrl);
                                                                    return fullUrl ? (
                                                                        <button
                                                                            key={img.imageId || idx}
                                                                            type="button"
                                                                            onClick={() => setPreviewImage(fullUrl)}
                                                                            className="rounded-lg overflow-hidden border border-white/10 hover:border-primary-400/50 transition-colors focus:outline-none"
                                                                        >
                                                                            <img src={fullUrl} alt={`Feedback ${idx + 1}`} className="w-16 h-16 object-cover" />
                                                                        </button>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {feedbackTotalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={feedbackPage <= 1}
                                            onClick={() => {
                                                const p = feedbackPage - 1;
                                                setFeedbackPage(p);
                                                fetchFeedback(p);
                                            }}
                                        >
                                            ‹
                                        </Button>
                                        {Array.from({ length: feedbackTotalPages }, (_, i) => i + 1).map((p) => (
                                            <Button
                                                key={p}
                                                size="sm"
                                                variant={p === feedbackPage ? 'default' : 'outline'}
                                                className={p === feedbackPage ? 'bg-primary-500' : ''}
                                                onClick={() => {
                                                    setFeedbackPage(p);
                                                    fetchFeedback(p);
                                                }}
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={feedbackPage >= feedbackTotalPages}
                                            onClick={() => {
                                                const p = feedbackPage + 1;
                                                setFeedbackPage(p);
                                                fetchFeedback(p);
                                            }}
                                        >
                                            ›
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Image Preview Overlay */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold z-10"
                        onClick={() => setPreviewImage(null)}
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
