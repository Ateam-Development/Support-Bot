"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMessages, subscribeToMetadata } from '@/lib/firebase-realtime';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import ConversationList from '@/components/conversations/ConversationList';
import ConversationDetail from '@/components/conversations/ConversationDetail';
import { ChevronDown, Copy, Check } from 'lucide-react';

export default function ConversationsPage() {
    const params = useParams();
    const urlChatbotId = params?.id; // Get ID from URL if present

    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatbotId, setChatbotId] = useState(urlChatbotId || null);
    const [chatbots, setChatbots] = useState([]);
    const [copiedId, setCopiedId] = useState(false);

    // CRITICAL DEBUG - This should show immediately
    if (typeof window !== 'undefined') {
        console.log('[DEBUG-ID] Component rendering. User:', user, 'AuthLoading:', authLoading, 'ChatbotId:', chatbotId, 'Conversations:', conversations.length);
    }

    useEffect(() => {
        if (urlChatbotId) {
            setChatbotId(urlChatbotId);
        }
    }, [urlChatbotId]);

    useEffect(() => {
        console.log('[DEBUG-ID] ConversationsPage mounted. User:', user ? user.email : 'null', 'AuthLoading:', authLoading);
        if (!authLoading) {
            if (user) {
                fetchChatbots();
            } else {
                setLoading(false); // Stop loading if no user
                console.log('[DEBUG-ID] No user found, stopping load.');
            }
        }
    }, [user, authLoading]);

    // replaced by realtime listener below

    // Real-time listener for selected conversation messages
    useEffect(() => {
        if (!selectedConversation?.id) return;

        const unsubscribe = subscribeToMessages(selectedConversation.id, (messages) => {
            setSelectedConversation(prev => ({
                ...prev,
                messages: messages
            }));
        });

        return () => unsubscribe();
    }, [selectedConversation?.id]);

    // Real-time listener for conversation metadata (unread counts)
    useEffect(() => {
        if (!conversations.length) return;

        const unsubscribers = conversations.map(conv =>
            subscribeToMetadata(conv.id, (metadata) => {
                if (metadata) {
                    setConversations(prev => prev.map(c =>
                        c.id === conv.id
                            ? { ...c, unreadCount: metadata.unreadCount || 0, lastMessageType: metadata.lastMessageType }
                            : c
                    ));
                }
            })
        );

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [conversations.map(c => c.id).join(',')]);

    const fetchChatbots = async () => {
        try {
            console.log('[DEBUG-ID] Fetching chatbots...');
            const token = await user.getIdToken();
            const res = await fetch('/api/chatbots', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            console.log('[DEBUG-ID] Chatbots response:', data);
            if (data.success && data.data.length > 0) {
                setChatbots(data.data);
                // Only set default if NO ID provided in URL
                if (!chatbotId && !urlChatbotId) {
                    console.log('[DEBUG-ID] Setting initial chatbotId:', data.data[0].id);
                    setChatbotId(data.data[0].id);
                }
            } else {
                console.log('[DEBUG-ID] No chatbots found or error:', data);
            }
        } catch (error) {
            console.error('[DEBUG-ID] Failed to fetch chatbots:', error);
        }
    };

    // Real-time listener for conversation list
    useEffect(() => {
        if (!chatbotId || !user) {
            // Only stop loading if we are logged in but have no chatbotId
            // If user is null, we wait for auth.
            if (user && !chatbotId) setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'conversations'),
            where('chatbotId', '==', chatbotId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });

            // Sort by updatedAt descending
            convs.sort((a, b) => {
                const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (new Date(a.updatedAt).getTime() || 0);
                const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (new Date(b.updatedAt).getTime() || 0);
                return tB - tA;
            });

            setConversations(convs);
            setLoading(false);
            console.log('[DEBUG-ID] Realtime update. Count:', convs.length);
        }, (error) => {
            console.error('[DEBUG-ID] Snapshot error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatbotId, user]);

    const handleSelectConversation = async (conv) => {
        setSelectedConversation(conv);

        // Mark as read
        if (conv.unreadCount > 0) {
            try {
                const token = await user.getIdToken();
                await fetch(`/api/conversations/detail/${conv.id}/read`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                // Update local state immediately
                setConversations(prev => prev.map(c =>
                    c.id === conv.id ? { ...c, unreadCount: 0 } : c
                ));
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }

        // Fetch full conversation details
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/conversations/detail/${conv.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedConversation(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch conversation details:', error);
        }
    };

    const handleSendMessage = async (content) => {
        if (!selectedConversation) return;

        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/conversations/detail/${selectedConversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            const data = await res.json();
            if (data.success) {
                // Real-time listener will update the UI
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    };

    const copyChatbotId = () => {
        if (!chatbotId) return;
        navigator.clipboard.writeText(chatbotId);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    if (loading && !chatbotId) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0a0a0a]">
            {/* Header */}
            <header className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Conversations</h1>
                    <p className="text-gray-400">Real-time chat with instant updates</p>
                    {/* DEBUG INFO */}
                    <div className="mt-2 p-2 bg-red-500/20 border border-red-500 rounded text-xs text-white">
                        <strong>DEBUG [ID]:</strong> User: {user ? user.email : 'null'} |
                        ChatbotId: {chatbotId || 'null'} (URL: {urlChatbotId || 'none'}) |
                        Conversations: {conversations.length}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Chatbot Selector */}
                    {chatbots.length > 0 && (
                        <div className="relative">
                            <select
                                value={chatbotId || ''}
                                onChange={(e) => setChatbotId(e.target.value)}
                                className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer min-w-[200px]"
                            >
                                {chatbots.map(bot => (
                                    <option key={bot.id} value={bot.id} className="bg-[#1a1a1a]">
                                        {bot.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    )}

                    {chatbotId && (
                        <button
                            onClick={copyChatbotId}
                            className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-lg text-sm transition-all"
                        >
                            {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="w-96 flex-shrink-0">
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversation?.id}
                        onSelect={handleSelectConversation}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>
                <div className="flex-1">
                    <ConversationDetail
                        conversation={selectedConversation}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>
        </div>
    );
}
