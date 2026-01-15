"use client";
import React from 'react';
import { Bot, User, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MessageItem({ message, isOwn = false }) {
    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        let date;
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else if (timestamp?.toDate) {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            // Fallback for weird objects or invalid data
            return '';
        }

        // Check for invalid date
        if (isNaN(date.getTime())) return '';

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const isAI = message.type === 'ai';
    const isLive = message.type === 'live';
    const isUserMessage = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'} mb-4`}
        >
            {/* Avatar */}
            {!isUserMessage && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}>
                    {isLive ? (
                        <Headphones className="w-4 h-4 text-green-400" />
                    ) : (
                        <Bot className="w-4 h-4 text-blue-400" />
                    )}
                </div>
            )}

            {isUserMessage && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Message Content */}
            <div className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {/* Sender Name & Type Badge */}
                {!isUserMessage && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400">
                            {isLive ? (message.senderName || 'Support Agent') : 'AI Assistant'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isLive
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                            {isLive ? 'Live Agent' : 'AI'}
                        </span>
                    </div>
                )}

                {/* User Label */}
                {isUserMessage && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400">
                            {message.visitorId || 'Visitor'}
                        </span>
                    </div>
                )}

                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-2.5 ${isUserMessage
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                    }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                    </p>
                </div>

                {/* Timestamp */}
                <span className="text-xs text-gray-500 mt-1">
                    {formatTime(message.timestamp)}
                </span>
            </div>
        </motion.div>
    );
}
