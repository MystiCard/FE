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
                <Card className="w-full max-w-md animate-scale-in text-center p-8">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold mb-2">Listing Created!</CardTitle>
                    <p className="text-muted-foreground mb-6">Your card has been successfully listed on the marketplace.</p>
                    <Button onClick={() => navigate('/marketplace')} className="w-full">
                        Return to Marketplace
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-serif mb-2">Sell Your Card</h1>
                <p className="text-muted-foreground">Fill in the details below to list your card for sale</p>
            </div>

            <Card className="animate-fade-in">
                <CardHeader>
                    <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload Placeholder */}
                        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary-500/50 transition-colors cursor-pointer bg-white/5">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold mb-1">Upload Card Image</h3>
                            <p className="text-sm text-muted-foreground">Drag and drop or click to browse</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Tag className="w-4 h-4" /> Card Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Charizard VMAX"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Price (VND)
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="e.g. 500000"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            {/* Condition */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Condition</label>
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                >
                                    <option value="Mint">Mint</option>
                                    <option value="Near Mint">Near Mint</option>
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Played">Played</option>
                                </select>
                            </div>

                            {/* Rarity */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rarity</label>
                                <select
                                    name="rarity"
                                    value={formData.rarity}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none"
                                >
                                    <option value="Common">Common</option>
                                    <option value="Uncommon">Uncommon</option>
                                    <option value="Rare">Rare</option>
                                    <option value="Ultra Rare">Ultra Rare</option>
                                    <option value="Secret Rare">Secret Rare</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Describe the card's details, specific flaws, or holo pattern..."
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none resize-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-4">
                            <Link to="/marketplace" className="w-full">
                                <Button variant="outline" type="button" className="w-full">
                                    Cancel
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                variant="premium"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating Listing...' : 'Post Listing'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
