import React, { useState } from 'react';
import { useChatbot } from '../contexts/ChatbotContext';
import { ChevronDown, Plus } from 'lucide-react';
import { useRouter, usePathname, useParams } from 'next/navigation';

export default function ChatbotSelector() {
    const { chatbots, selectedChatbot, selectChatbot, createChatbot, loading } = useChatbot();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newChatbotName, setNewChatbotName] = useState('');

    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const handleSelect = (chatbot) => {
        selectChatbot(chatbot);
        setIsOpen(false);

        // If we serve a route with an ID parameter, replace it
        // Pattern: /section/[id] -> /section/[newId]
        if (params?.id) {
            // Replace the old ID in the path with the new one
            // We can't just replace string because ID might appear elsewhere, but usually generic replace is safe enough for UUIDs in standard paths
            const newPath = pathname.replace(params.id, chatbot.id);
            router.push(newPath);
        } else {
            // Default to dashboard if we aren't on a specific page
            router.push(`/dashboard/${chatbot.id}`);
        }
    };

    const handleCreateNew = async () => {
        if (!newChatbotName.trim()) return;

        setIsCreating(true);
        try {
            const newBot = await createChatbot({ name: newChatbotName.trim() });
            setNewChatbotName('');
            setIsOpen(false);

            // Navigate to the new bot's dashboard
            router.push(`/dashboard/${newBot.id}`);

        } catch (error) {
            console.error('Error creating chatbot:', error);
            alert('Failed to create chatbot. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 animate-pulse">
                <div className="h-5 bg-white/10 rounded"></div>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between transition-colors Group"
            >
                <span className="text-white font-medium truncate">
                    {selectedChatbot ? selectedChatbot.name : 'Select Chatbot'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-xl z-[100] max-h-80 overflow-y-auto custom-scrollbar">
                        {/* Create New Section */}
                        <div className="p-3 border-b border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newChatbotName}
                                    onChange={(e) => setNewChatbotName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
                                    placeholder="New chatbot name..."
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                    disabled={isCreating}
                                />
                                <button
                                    onClick={handleCreateNew}
                                    disabled={isCreating || !newChatbotName.trim()}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1 text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    {isCreating ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>

                        {/* Chatbot List */}
                        <div className="py-1">
                            {chatbots.length === 0 ? (
                                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                    No chatbots yet. Create your first one above!
                                </div>
                            ) : (
                                chatbots.map((chatbot) => (
                                    <button
                                        key={chatbot.id}
                                        onClick={() => handleSelect(chatbot)}
                                        className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${selectedChatbot?.id === chatbot.id
                                            ? 'bg-blue-600/10 text-blue-400'
                                            : 'text-gray-300'
                                            }`}
                                    >
                                        <div className="font-medium truncate">{chatbot.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {chatbot.createdAt?.seconds
                                                ? new Date(chatbot.createdAt.seconds * 1000).toLocaleDateString()
                                                : 'Just now'}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
