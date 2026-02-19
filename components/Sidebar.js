"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Layers,
    MessageSquare,
    History,
    Settings,
    LogOut,
    GitBranch
} from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ChatbotSelector from './ChatbotSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbot } from '@/contexts/ChatbotContext';
import { subscribeToChatbotStats } from '@/lib/firebase-realtime';

const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { selectedChatbot } = useChatbot();
    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        if (!selectedChatbot) return;

        const unsubscribe = subscribeToChatbotStats(selectedChatbot.id, (stats) => {
            setUnreadCount(stats?.unreadCount || 0);
        });

        return () => unsubscribe();
    }, [selectedChatbot]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const menuItems = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            path: selectedChatbot ? `/dashboard/${selectedChatbot.id}` : '/'
        },
        {
            name: 'Knowledge',
            icon: BookOpen,
            path: selectedChatbot ? `/knowledge/${selectedChatbot.id}` : '/knowledge',
            disabled: !selectedChatbot
        },
        {
            name: 'Sections',
            icon: Layers,
            path: selectedChatbot ? `/sections/${selectedChatbot.id}` : '/sections',
            disabled: !selectedChatbot
        },
        {
            name: 'Chatbot',
            icon: MessageSquare,
            path: selectedChatbot ? `/chatbot/${selectedChatbot.id}` : '/chatbot',
            disabled: !selectedChatbot
        },
        {
            name: 'Conversations',
            icon: History,
            path: selectedChatbot ? `/conversations/${selectedChatbot.id}` : '/conversations',
            disabled: !selectedChatbot,
            badge: unreadCount > 0 ? unreadCount : null
        },
        {
            name: 'Flow',
            icon: GitBranch, // You'll need to import this
            path: selectedChatbot ? `/flow/${selectedChatbot.id}` : '/flow',
            disabled: !selectedChatbot
        },
        {
            name: 'Settings',
            icon: Settings,
            path: selectedChatbot ? `/settings/${selectedChatbot.id}` : '/settings',
            disabled: !selectedChatbot
        },
    ];

    function cn(...inputs) {
        return twMerge(clsx(inputs));
    }

    return (
        <div className="w-64 h-screen bg-[#0a0a0a] border-r border-white/5 flex flex-col flex-none z-50">
            {/* Header */}
            <div className="p-6 flex items-center gap-3 border-b border-white/5">
                <div className="w-12 h-12 flex items-center justify-center">
                    <AnimatedLogo />
                </div>
                <span className="text-white font-bold tracking-wide">Adeptimize Solutions</span>
            </div>

            {/* Chatbot Selector */}
            <div className="p-4 border-b border-white/5">
                <ChatbotSelector />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

                    if (item.disabled) {
                        return (
                            <div
                                key={item.name}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 cursor-not-allowed opacity-50"
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium text-sm">{item.name}</span>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-600/10 text-blue-500"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-blue-500" : "text-gray-500 group-hover:text-white")} />
                            <span className="font-medium text-sm flex-1">{item.name}</span>
                            {item.badge && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-white/5">
                <div
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || 'No email'}</p>
                    </div>
                    <LogOut className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
