import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="glass-card mt-20 border-t border-white/10">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <img
                                src="/logo/logo.png"
                                alt="MysticCard Logo"
                                className="h-12 w-12 object-contain"
                            />
                            <h3 className="text-2xl font-bold gradient-text font-serif">MysticCard</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Your premier destination for trading card games. Collect, trade, and compete with the best.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/about" className="text-muted-foreground hover:text-primary-400 transition-colors">About Us</Link></li>
                            <li><Link to="/products" className="text-muted-foreground hover:text-primary-400 transition-colors">Products</Link></li>
                            <li><Link to="/marketplace" className="text-muted-foreground hover:text-primary-400 transition-colors">Marketplace</Link></li>
                            <li><Link to="/blog" className="text-muted-foreground hover:text-primary-400 transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/help" className="text-muted-foreground hover:text-primary-400 transition-colors">Help Center</Link></li>
                            <li><Link to="/contact" className="text-muted-foreground hover:text-primary-400 transition-colors">Contact Us</Link></li>
                            <li><Link to="/shipping" className="text-muted-foreground hover:text-primary-400 transition-colors">Shipping Info</Link></li>
                            <li><Link to="/returns" className="text-muted-foreground hover:text-primary-400 transition-colors">Returns</Link></li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h4 className="font-semibold mb-4">Connect With Us</h4>
                        <div className="flex space-x-4">
                            <a href="#" className="hover-lift p-2 rounded-lg hover:bg-white/10 transition-all">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="hover-lift p-2 rounded-lg hover:bg-white/10 transition-all">
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a href="#" className="hover-lift p-2 rounded-lg hover:bg-white/10 transition-all">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="#" className="hover-lift p-2 rounded-lg hover:bg-white/10 transition-all">
                                <Youtube className="h-5 w-5" />
                            </a>
                        </div>
                        <div className="mt-4">
                            <a href="mailto:support@myscard.com" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary-400 transition-colors">
                                <Mail className="h-4 w-4" />
                                <span>support@myscard.com</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} MyScard. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};
