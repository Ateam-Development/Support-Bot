"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import MessageItem from './MessageItem';

export default function ConversationDetail({ conversation, onSendMessage }) {
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        scrollToBottom();
    }, [conversation?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput('');
        setIsSending(true);

        try {
            await onSendMessage(message);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!conversation) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] text-center p-8">
                <MessageCircle className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Conversation Selected</h3>
                <p className="text-gray-400 text-sm">
                    Select a conversation from the list to view details
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                            {(conversation.visitorId || conversation.userId || 'A').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">
                            {conversation.visitorId || conversation.userId || 'Anonymous'}
                        </h3>
                        <p className="text-xs text-gray-400">
                            {conversation.messages?.length || 0} messages
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {conversation.messages && conversation.messages.length > 0 ? (
                    <>
                        {conversation.messages.map((msg, index) => {
                            // Generate unique key from message ID, timestamp, or fallback to index
                            const messageKey = msg.id || msg.timestamp || `msg-${index}-${msg.content?.substring(0, 10)}`;
                            return (
                                <MessageItem key={messageKey} message={msg} />
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-sm">No messages yet</p>
                    </div>
                )}

                {/* Typing Indicator */}
                {isSending && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 mb-4"
                    >
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 border border-white/10">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isSending}
                        className="flex-1 bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-all flex items-center justify-center"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Send live messages to respond to visitors
                </p>
            </div>
        </div>
    );
}
