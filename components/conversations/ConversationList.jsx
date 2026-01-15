"use client";
import React from 'react';
import { Search, MessageCircle, Bot, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    searchQuery,
    onSearchChange
}) {
    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        let date;
        try {
            date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        } catch (e) {
            return '';
        }

        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    };

    const getLastMessage = (conv) => {
        // API returns lastMessage as a string
        return conv.lastMessage || 'No messages yet';
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const visitorId = conv.visitorId || conv.userId || '';
        const lastMessage = getLastMessage(conv);
        return visitorId.toLowerCase().includes(query) ||
            lastMessage.toLowerCase().includes(query);
    });

    return (
        <div className="flex flex-col h-full bg-white/5 border-r border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">Inbox</h2>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <MessageCircle className="w-12 h-12 text-gray-600 mb-3" />
                        <p className="text-gray-400 text-sm">
                            {searchQuery ? 'No conversations found' : 'No conversations yet'}
                        </p>
                    </div>
                ) : (
                    <div className="p-2">
                        {filteredConversations.map((conv) => {
                            const isSelected = conv.id === selectedId;
                            const hasUnread = conv.unreadCount > 0;
                            const lastMessageType = conv.lastMessageType || 'ai';

                            return (
                                <motion.div
                                    key={conv.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => onSelect(conv)}
                                    className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${isSelected
                                        ? 'bg-blue-500/20 border border-blue-500/50'
                                        : 'bg-white/5 border border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${lastMessageType === 'live'
                                            ? 'bg-green-500/20'
                                            : 'bg-blue-500/20'
                                            }`}>
                                            {lastMessageType === 'live' ? (
                                                <Headphones className="w-5 h-5 text-green-400" />
                                            ) : (
                                                <Bot className="w-5 h-5 text-blue-400" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className={`text-sm font-medium truncate ${hasUnread ? 'text-white' : 'text-gray-300'
                                                    }`}>
                                                    {conv.visitorId || conv.userId || 'Anonymous'}
                                                </p>
                                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                    {formatTime(conv.updatedAt)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <p className={`text-xs truncate ${hasUnread ? 'text-gray-300 font-medium' : 'text-gray-500'
                                                    }`}>
                                                    {getLastMessage(conv)}
                                                </p>

                                                {/* Unread Badge */}
                                                {hasUnread && (
                                                    <span className="ml-2 flex-shrink-0 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
