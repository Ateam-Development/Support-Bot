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

                // Check for new unread messages
                conversations.forEach(conv => {
                    // Skip if currently viewing this conversation
                    if (pathname.includes(`/conversations`) && window.location.href.includes(conv.id)) {
                        return;
                    }

                    const prevConv = prevConvs.find(c => c.id === conv.id);

                    // Condition 1: New conversation created by user
                    const isNew = !prevConv && conv.unreadCount > 0 && conv.lastMessageType !== 'ai';

                    // Condition 2: Existing conversation has new unread message
                    const hasNewMessage = prevConv &&
                        conv.unreadCount > prevConv.unreadCount &&
                        conv.lastMessageType !== 'ai';

                    if (isNew || hasNewMessage) {
                        // Play sound (optional)
                        // const audio = new Audio('/notification.mp3');
                        // audio.play().catch(e => console.log('Audio play failed', e));

                        // Show toast
                        toast(
                            <div className="flex flex-col gap-1 w-full" onClick={() => {
                                router.push(`/conversations`);
                                // Ideally we would navigate to the specific conversation but the page architecture
                                // might need adjustment to handle URL params for selection.
                                // For now, taking them to the inbox is good.
                            }}>
                                <div className="flex items-center gap-2 font-semibold">
                                    <MessageCircle className="w-4 h-4 text-blue-500" />
                                    <span>New Message</span>
                                </div>
                                <div className="text-sm font-medium truncate">
                                    {conv.visitorId || 'Visitor'}: {conv.lastMessage || 'Sent a message'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {chatbot.name} • Just now
                                </div>
                            </div>,
                            {
                                duration: 5000,
                                position: 'top-right',
                                style: {
                                    cursor: 'pointer',
                                    background: '#1a1a1a',
                                    border: '1px solid #333',
                                    color: 'white'
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
