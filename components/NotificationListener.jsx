"use client";
import { useEffect, useRef } from 'react';
import { useChatbot } from '@/contexts/ChatbotContext';
import { subscribeToConversations } from '@/lib/db-client';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

export default function NotificationListener() {
    const { chatbots } = useChatbot();
    const pathname = usePathname();
    const router = useRouter();

    // Store previous states to detect changes
    const previousConversationsRef = useRef({});

    useEffect(() => {
        if (!chatbots || chatbots.length === 0) return;

        console.log('[NotificationListener] Setting up listeners for', chatbots.length, 'chatbots');

        const unsubscribers = [];

        chatbots.forEach(chatbot => {
            // Subscribe to recent conversations for each chatbot
            // We only need a few to detect new messages at the top
            const unsub = subscribeToConversations(chatbot.id, (conversations) => {
                const prevConvs = previousConversationsRef.current[chatbot.id] || [];

                // Check for new unread messages in LIVE conversations ONLY
                conversations.forEach(conv => {
                    // Skip if currently viewing this conversation
                    if (pathname.includes(`/conversations`) && (window.location.href.includes(conv.id) || pathname.includes(conv.id))) {
                        return;
                    }

                    const prevConv = prevConvs.find(c => c.id === conv.id);

                    // Check if this conversation or its latest message is LIVE (Not AI)
                    const lastMsg = Array.isArray(conv.messages) && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
                    const isLive = conv.lastMessageType === 'live' || lastMsg?.type === 'live';

                    // Strict filter: ONLY LIVE conversations trigger popup toasts
                    if (!isLive) return;

                    // Condition 1: New live conversation created with unread messages
                    const isNew = !prevConv && conv.unreadCount > 0;

                    // Condition 2: Existing live conversation has newly received unread message
                    const hasNewMessage = prevConv && conv.unreadCount > (prevConv.unreadCount || 0);

                    if (isNew || hasNewMessage) {
                        const messageText = lastMsg?.content || lastMsg?.text || conv.lastMessage || 'New live chat request';

                        // Show Live Chat Toast
                        toast(
                            <div
                                className="flex flex-col gap-1 w-full"
                                onClick={() => {
                                    router.push(`/conversations/${chatbot.id}`);
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-semibold text-emerald-400">
                                        <MessageCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
                                        <span>Live Chat Request</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Live Agent
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-white truncate">
                                    {conv.visitorId || 'Visitor'}: "{messageText}"
                                </div>
                                <div className="text-xs text-gray-400">
                                    {chatbot.name} • Click to open conversation
                                </div>
                            </div>,
                            {
                                duration: 7000,
                                position: 'top-right',
                                style: {
                                    cursor: 'pointer',
                                    background: '#0d131a',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    color: 'white',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                }
                            }
                        );
                    }
                });

                // Update ref
                previousConversationsRef.current[chatbot.id] = conversations;
            }, 10); // Limit to 10 to reduce check size

            unsubscribers.push(unsub);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [chatbots, pathname, router]);

    return null; // This component has no visual output other than toasts
}
