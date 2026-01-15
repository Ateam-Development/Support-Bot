"use client";
import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare, MoreVertical, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CreateChatbotModal from './CreateChatbotModal';

export default function ChatbotList() {
    const [chatbots, setChatbots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchChatbots();
    }, []);

    const fetchChatbots = async () => {
        try {
            const res = await fetch('/api/chatbots');
            const data = await res.json();
            if (data.success) {
                setChatbots(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch chatbots:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChatbotCreated = (newChatbot) => {
        setChatbots([newChatbot, ...chatbots]);
    };

    const getColorClass = (colorName) => {
        const colors = {
            blue: 'bg-blue-600',
            purple: 'bg-purple-600',
            green: 'bg-green-600',
            orange: 'bg-orange-600',
            red: 'bg-red-600',
        };
        return colors[colorName] || 'bg-blue-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create New Card */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setIsModalOpen(true)}
                    className="group h-[200px] border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-white font-medium mb-1">Create New Chatbot</h3>
                    <p className="text-sm text-gray-500">Add a new assistant to your fleet</p>
                </motion.button>

                {/* Chatbot Cards */}
                {chatbots.map((chatbot, index) => (
                    <motion.div
                        key={chatbot.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all flex flex-col h-[200px]"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl ${getColorClass(chatbot.primaryColor)} flex items-center justify-center text-white`}>
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <button className="text-gray-500 hover:text-white transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{chatbot.name}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-auto">
                            {chatbot.welcomeMessage}
                        </p>

                        <Link
                            href={`/chatbot/${chatbot.id}`}
                            className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-400 group-hover:text-white transition-colors"
                        >
                            Manage Chatbot <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>
                ))}
            </div>

            <CreateChatbotModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={handleChatbotCreated}
            />
        </>
    );
}
