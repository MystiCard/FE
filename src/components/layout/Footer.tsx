import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="glass-card mt-12 border-t border-white/10 xl:ml-80">
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Brand */}
                    <div className="space-y-2">
                        <Link to="/" className="flex items-center gap-2 w-fit">
                            <img
                                src="/logo/logo.png"
                                alt="MysticCard Logo"
                                className="h-8 w-8 object-contain"
                            />
                            <h3 className="text-lg font-bold gradient-text font-serif">MysticCard</h3>
                        </Link>
                        <p className="text-xs text-muted-foreground leading-snug">
                            Điểm đến hàng đầu cho thẻ bài. Sưu tầm, giao dịch và cạnh tranh cùng cộng đồng.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Liên kết nhanh</h4>
                        <ul className="space-y-1 text-xs">
                            <li><Link to="/" className="text-muted-foreground hover:text-primary-400">Trang chủ</Link></li>
                            <li><Link to="/about" className="text-muted-foreground hover:text-primary-400">Giới thiệu</Link></li>
                            <li><Link to="/shop" className="text-muted-foreground hover:text-primary-400">Cửa hàng</Link></li>
                            <li><Link to="/products" className="text-muted-foreground hover:text-primary-400">Sản phẩm</Link></li>
                            <li><Link to="/marketplace" className="text-muted-foreground hover:text-primary-400">Sàn giao dịch</Link></li>
                            <li><Link to="/portfolio" className="text-muted-foreground hover:text-primary-400">Bộ sưu tập</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Hỗ trợ</h4>
                        <ul className="space-y-1 text-xs">
                            <li><Link to="/about" className="text-muted-foreground hover:text-primary-400">Giới thiệu & Trợ giúp</Link></li>
                            <li><a href="mailto:support@myscard.com" className="text-muted-foreground hover:text-primary-400">Liên hệ</a></li>
                            <li><Link to="/about" className="text-muted-foreground hover:text-primary-400">Vận chuyển</Link></li>
                            <li><Link to="/about" className="text-muted-foreground hover:text-primary-400">Đổi trả</Link></li>
                            <li><Link to="/terms" className="text-muted-foreground hover:text-primary-400">Điều khoản sử dụng</Link></li>
                            <li><Link to="/privacy" className="text-muted-foreground hover:text-primary-400">Chính sách bảo mật</Link></li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Kết nối</h4>
                        <div className="flex gap-2">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary-400" aria-label="Facebook">
                                <Facebook className="h-4 w-4" />
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary-400" aria-label="Twitter">
                                <Twitter className="h-4 w-4" />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary-400" aria-label="Instagram">
                                <Instagram className="h-4 w-4" />
                            </a>
                            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary-400" aria-label="YouTube">
                                <Youtube className="h-4 w-4" />
                            </a>
                        </div>
                        <div className="mt-2">
                            <a href="mailto:support@myscard.com" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary-400">
                                <Mail className="h-3.5 w-3.5" />
                                <span>support@myscard.com</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-5 pt-5 border-t border-white/10 text-center text-xs text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} MysticCard. Bảo lưu mọi quyền.</p>
                </div>
            </div>
        </footer>
    );
};
