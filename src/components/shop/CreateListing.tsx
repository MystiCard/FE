import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, DollarSign, Tag, FileText, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const CreateListing: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        condition: 'Near Mint',
        description: '',
        category: 'Pokemon',
        rarity: 'Common'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSuccess(true);

        // Redirect after delay
        setTimeout(() => {
            navigate('/marketplace');
        }, 2000);
    };

    if (isSuccess) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="w-full max-w-md text-center p-8">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold mb-2">Đã đăng bán!</CardTitle>
                    <p className="text-muted-foreground mb-6">Thẻ của bạn đã được đăng bán lên sàn thành công.</p>
                    <Button onClick={() => navigate('/marketplace')} className="w-full">
                        Về sàn giao dịch
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-serif mb-2">Bán thẻ của bạn</h1>
                <p className="text-muted-foreground">Điền thông tin bên dưới để đăng bán thẻ</p>
            </div>

            <Card className="">
                <CardHeader>
                    <CardTitle>Thông tin sản phẩm</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload Placeholder */}
                        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary-500/50 cursor-pointer bg-white/5">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold mb-1">Tải ảnh thẻ</h3>
                            <p className="text-sm text-muted-foreground">Kéo thả hoặc bấm để chọn ảnh</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Tag className="w-4 h-4" /> Tên thẻ
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: Charizard VMAX"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Giá (VND)
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="ví dụ: 500000"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            {/* Condition */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tình trạng</label>
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                >
                                    <option value="Mint">Mới</option>
                                    <option value="Near Mint">Gần mới</option>
                                    <option value="Excellent">Rất tốt</option>
                                    <option value="Good">Tốt</option>
                                    <option value="Played">Đã chơi</option>
                                </select>
                            </div>

                            {/* Rarity */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Độ hiếm</label>
                                <select
                                    name="rarity"
                                    value={formData.rarity}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                >
                                    <option value="Common">Thường</option>
                                    <option value="Uncommon">Không hiếm</option>
                                    <option value="Rare">Hiếm</option>
                                    <option value="Ultra Rare">Cực hiếm</option>
                                    <option value="Secret Rare">Bí mật hiếm</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Mô tả
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Mô tả chi tiết thẻ, lỗi (nếu có), hoặc pattern holo..."
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none resize-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-4">
                            <Link to="/marketplace" className="w-full">
                                <Button variant="outline" type="button" className="w-full">
                                    Hủy
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                variant="premium"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang đăng...' : 'Đăng bán'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
