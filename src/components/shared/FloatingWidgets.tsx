import React from 'react';
import { MessageSquare, HelpCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const FloatingWidgets: React.FC = () => {
    const [isChatOpen, setIsChatOpen] = React.useState(false);

    return (
        <>
            {/* Floating Action Buttons */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40">
                {/* Help Button */}
                <a
                    href="/about"
                    className="glass-card-strong p-4 rounded-full shadow-lg group"
                    title="Trung tâm trợ giúp"
                >
                    <HelpCircle className="h-6 w-6 group-hover:text-primary-400" />
                </a>

                {/* Chat Button */}
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="glass-card-strong p-4 rounded-full shadow-lg bg-gradient-to-br from-primary-500 to-accent-500 group"
                    title="Chat với chúng tôi"
                >
                    <MessageSquare className="h-6 w-6 text-white" />
                </button>
            </div>

            {/* Chat Widget */}
            {isChatOpen && (
                <div className="fixed bottom-32 right-8 w-96 h-[500px] glass-card-strong rounded-2xl shadow-2xl z-50 flex flex-col ">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Hỗ trợ MysticCard</h3>
                                    <p className="text-xs text-muted-foreground">Chúng tôi sẵn sàng hỗ trợ bạn!</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="text-muted-foreground hover:text-foreground "
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0" />
                            <div className="glass-card p-3 rounded-lg max-w-[80%]">
                                <p className="text-sm">Xin chào! Bạn cần hỗ trợ gì hôm nay?</p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nhập tin nhắn..."
                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                            />
                            <Button size="icon" variant="premium">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
