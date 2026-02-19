"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMessages, subscribeToMetadata } from '@/lib/firebase-realtime';
import { subscribeToConversations } from '@/lib/db-client';
import ConversationList from '@/components/conversations/ConversationList';
import ConversationDetail from '@/components/conversations/ConversationDetail';
import EmailListModal from '@/components/conversations/EmailListModal';
import { ChevronDown, Copy, Check, Mail } from 'lucide-react';
import Loader from '@/components/Loader';

export default function ConversationsPage() {
    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatbotId, setChatbotId] = useState(null);
    const [chatbots, setChatbots] = useState([]);
    const [copiedId, setCopiedId] = useState(false);

    // Email Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [currentChatbot, setCurrentChatbot] = useState(null);

    // CRITICAL DEBUG - This should show immediately
    if (typeof window !== 'undefined') {
        console.log("ConversationsPage RENDERED - Check for 'Manage Emails' button");
        window.debugChatbotId = chatbotId;
    }

    useEffect(() => {
        console.log("ConversationsPage MOUNTED");
        if (!authLoading) {
            if (user) {
                fetchChatbots();
            } else {
                setLoading(false); // Stop loading if no user
                console.log('[DEBUG] No user found, stopping load.');
            }
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (chatbotId) {
            setLoading(true);
            const unsubscribe = subscribeToConversations(chatbotId, (data) => {
                console.log('[DEBUG] Realtime conversations update:', data.length);
                setConversations(data);
                setLoading(false);
            });

            // Update current chatbot object for email modal
            const bot = chatbots.find(b => b.id === chatbotId);
            if (bot) setCurrentChatbot(bot);

            return () => unsubscribe();
        }
    }, [chatbotId, chatbots]);

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
    // Removed: Firestore subscribeToConversations handles this now!
    // keeping the useEffect block empty or removing it to avoid errors if logic depended on it
    /* 
    useEffect(() => {
        if (!conversations.length) return;
        // ... (OLD LOGIC REMOVED)
    }, [conversations.map(c => c.id).join(',')]);
    */

    const fetchChatbots = async () => {
        try {
            console.log('[DEBUG] Fetching chatbots...');
            const token = await user.getIdToken();
            const res = await fetch('/api/chatbots', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            console.log('[DEBUG] Chatbots response:', data);
            if (data.success && data.data.length > 0) {
                setChatbots(data.data);
                if (!chatbotId) {
                    console.log('[DEBUG] Setting chatbotId to:', data.data[0].id);
                    setChatbotId(data.data[0].id);
                }
            } else {
                console.log('[DEBUG] No chatbots found or error:', data);
            }
        } catch (error) {
            console.error('[DEBUG] Failed to fetch chatbots:', error);
        }
    };

    // fetchConversations removed in favor of real-time listener

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

        // Fetch full conversation details from Firestore
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
                // Real-time listener will take over from here
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
                // Real-time listener will update the UI automatically
                // No need to manually update state
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

    // Email Management Handlers
    const handleAddEmail = async (email) => {
        if (!currentChatbot) return;
        const currentEmails = currentChatbot.notificationEmails || [];
        const newEmails = [...currentEmails, email];
        await updateChatbotEmails(newEmails);
    };

    const handleRemoveEmail = async (email) => {
        if (!currentChatbot) return;
        const currentEmails = currentChatbot.notificationEmails || [];
        const newEmails = currentEmails.filter(e => e !== email);
        await updateChatbotEmails(newEmails);
    };

    const updateChatbotEmails = async (emails) => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/chatbots/${chatbotId}/emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ emails })
            });

            if (!res.ok) throw new Error('Failed to update emails');

            // Update local state
            setChatbots(prev => prev.map(bot =>
                bot.id === chatbotId ? { ...bot, notificationEmails: emails } : bot
            ));
            setCurrentChatbot(prev => ({ ...prev, notificationEmails: emails }));

        } catch (error) {
            console.error('Failed to update emails:', error);
            alert('Failed to update emails');
        }
    };

    if (loading && !chatbotId) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
                <Loader />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0a0a0a]">
            {/* Header */}
            <header className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-white mb-2">Conversations</h1>
                        {/* MOVED HERE FOR VISIBILITY */}
                        <button
                            onClick={() => setShowEmailModal(true)}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition-all border border-white/10"
                        >
                            <Mail className="w-4 h-4" />
                            <span>Email Notifications</span>
                        </button>
                    </div>
                    <p className="text-gray-400">Real-time chat with instant updates</p>
                    {/* DEBUG INFO */}
                    <div className="mt-2 p-2 bg-red-500/20 border border-red-500 rounded text-xs text-white">
                        <strong>DEBUG:</strong> User: {user ? user.email : 'null'} |
                        AuthLoading: {authLoading ? 'true' : 'false'} |
                        ChatbotId: {chatbotId || 'null'} |
                        Chatbots: {chatbots.length} |
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



                    {/* Copy ID Button */}
                    {chatbotId && (
                        <button
                            onClick={copyChatbotId}
                            className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-lg text-sm transition-all"
                            title="Copy Chatbot ID for Widget"
                        >
                            {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                        </button>
                    )}


                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Conversation List */}
                <div className="w-96 flex-shrink-0">
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversation?.id}
                        onSelect={handleSelectConversation}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>

                {/* Right Panel - Conversation Detail */}
                <div className="flex-1">
                    <ConversationDetail
                        conversation={selectedConversation}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>

            <EmailListModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                emails={currentChatbot?.notificationEmails || []}
                onAddEmail={handleAddEmail}
                onRemoveEmail={handleRemoveEmail}
            />
        </div >
    );
}
