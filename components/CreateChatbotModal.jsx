"use client";
import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateChatbotModal({ isOpen, onClose, onCreated }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        welcomeMessage: 'Hi! How can I help you today?',
        primaryColor: 'blue'
    });

    const colors = [
        { name: 'blue', class: 'bg-blue-600' },
        { name: 'purple', class: 'bg-purple-600' },
        { name: 'green', class: 'bg-green-600' },
        { name: 'orange', class: 'bg-orange-600' },
        { name: 'red', class: 'bg-red-600' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/chatbots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                onCreated(data.data);
                onClose();
                setFormData({
                    name: '',
                    welcomeMessage: 'Hi! How can I help you today?',
                    primaryColor: 'blue'
                });
            }
        } catch (error) {
            console.error('Failed to create chatbot:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md p-6 rounded-2xl shadow-xl pointer-events-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Create New Chatbot</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Bot Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="My Awesome Assistant"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Welcome Message</label>
                                    <textarea
                                        required
                                        value={formData.welcomeMessage}
                                        onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Primary Color</label>
                                    <div className="flex gap-3">
                                        {colors.map((c) => (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, primaryColor: c.name })}
                                                className={`w-8 h-8 rounded-full ${c.class} transition-transform hover:scale-110 ${formData.primaryColor === c.name ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Create Chatbot
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
