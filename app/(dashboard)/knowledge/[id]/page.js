'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbot } from '@/contexts/ChatbotContext';
import {
    Plus,
    Globe,
    Upload,
    FileText,
    Search,
    Filter,
    RefreshCw
} from 'lucide-react';
import Loader from '@/components/Loader';

import AddWebsiteModal from '@/components/knowledge/AddWebsiteModal';
import AddTextModal from '@/components/knowledge/AddTextModal';
import AddFileModal from '@/components/knowledge/AddFileModal';
import EditKnowledgeModal from '@/components/knowledge/EditKnowledgeModal';
import SourcesList from '@/components/knowledge/SourcesList';

export default function KnowledgePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { selectedChatbot, selectChatbot, chatbots } = useChatbot();

    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedKnowledgeItem, setSelectedKnowledgeItem] = useState(null);

    // Initial Auth & Chatbot Setup
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (chatbots?.length > 0 && id) {
            const chatbot = chatbots.find(c => c.id === id);
            if (chatbot && selectedChatbot?.id !== id) {
                selectChatbot(chatbot);
            }
        }
    }, [id, chatbots, selectedChatbot, selectChatbot]);

    // Data Fetching
    const fetchKnowledge = useCallback(async () => {
        if (!id || !user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/knowledge/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                // Sort by createdAt desc
                const sortedData = (data.data || []).sort((a, b) => {
                    const dateA = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
                    const dateB = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
                    return dateB - dateA;
                });
                setSources(sortedData);
            }
        } catch (error) {
            console.error('Failed to fetch knowledge:', error);
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        fetchKnowledge();
    }, [fetchKnowledge]);

    // Handlers
    const handleAddWebsite = async ({ url, title, content }) => {
        const token = await user.getIdToken();
        const res = await fetch(`/api/knowledge/${id}/website`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ url, title, content })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to add website');
        fetchKnowledge();
    };

    const handleAddText = async ({ title, text }) => {
        const token = await user.getIdToken();
        const res = await fetch(`/api/knowledge/${id}/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, text })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to add text');
        fetchKnowledge();
    };

    const handleAddFile = async ({ filename, content, fileType }) => {
        const token = await user.getIdToken();
        const res = await fetch(`/api/knowledge/${id}/file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filename, content, fileType })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to upload file');
        fetchKnowledge();
    };

    const handleEditKnowledge = async (sourceId, { title, content }) => {
        const token = await user.getIdToken();
        const res = await fetch(`/api/knowledge/${id}/${sourceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to update knowledge source');
        fetchKnowledge();
    };

    const handleDelete = async (sourceId) => {
        if (!confirm('Are you sure you want to delete this source? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/knowledge/${id}/${sourceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Failed to delete');

            fetchKnowledge();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete source: ' + error.message);
            setLoading(false);
        }
    };

    const handleOpenEdit = (source) => {
        setSelectedKnowledgeItem(source);
        setIsEditModalOpen(true);
    };

    // Filtering
    const filteredSources = sources.filter(s => {
        const term = searchQuery.toLowerCase();
        const title = s.metadata?.title || s.metadata?.filename || s.metadata?.url || 'Untitled';
        return title.toLowerCase().includes(term);
    });

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Knowledge Base</h1>
                    <p className="text-gray-400">Manage, inspect, and fine-tune your website sources, documents, and manual entries for RAG AI.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsTextModalOpen(true)}
                        className="px-4 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Knowledge
                    </button>
                </div>
            </header>

            {/* Action Cards */}
            <div className="grid grid-cols-3 gap-6 mb-10">
                <button
                    onClick={() => setIsWebsiteModalOpen(true)}
                    className="p-6 bg-[#0a0a0a] border border-white/10 rounded-2xl hover:bg-white/5 hover:border-blue-500/30 transition-all text-left flex flex-col items-center justify-center gap-4 group"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Globe className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-semibold mb-1">Crawl Website</h3>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                            Crawl any website with preview & editing before saving to the knowledge base.
                        </p>
                    </div>
                </button>

                <button
                    onClick={() => setIsFileModalOpen(true)}
                    className="p-6 bg-[#0a0a0a] border border-white/10 rounded-2xl hover:bg-white/5 hover:border-green-500/30 transition-all text-left flex flex-col items-center justify-center gap-4 group"
                >
                    <div className="w-12 h-12 rounded-full bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-semibold mb-1">Upload File</h3>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                            Upload PDF, TXT, CSV, or DOCX documents to train your chatbot.
                        </p>
                    </div>
                </button>

                <button
                    onClick={() => setIsTextModalOpen(true)}
                    className="p-6 bg-[#0a0a0a] border border-white/10 rounded-2xl hover:bg-white/5 hover:border-purple-500/30 transition-all text-left flex flex-col items-center justify-center gap-4 group"
                >
                    <div className="w-12 h-12 rounded-full bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-semibold mb-1">Manual Text</h3>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                            Directly write or paste FAQs, notes, or instructions for immediate RAG indexing.
                        </p>
                    </div>
                </button>
            </div>

            {/* Sources List */}
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-white font-semibold">Knowledge Sources</h3>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-400 border border-white/5">
                            {sources.length} total
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search sources..."
                                className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20 w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={fetchKnowledge}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Refresh sources"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <SourcesList
                        sources={filteredSources}
                        loading={loading}
                        onDelete={handleDelete}
                        onEdit={handleOpenEdit}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddWebsiteModal
                isOpen={isWebsiteModalOpen}
                onClose={() => setIsWebsiteModalOpen(false)}
                onAdd={handleAddWebsite}
                chatbotId={id}
                user={user}
            />
            <AddTextModal
                isOpen={isTextModalOpen}
                onClose={() => setIsTextModalOpen(false)}
                onAdd={handleAddText}
            />
            <AddFileModal
                isOpen={isFileModalOpen}
                onClose={() => setIsFileModalOpen(false)}
                onAdd={handleAddFile}
            />
            <EditKnowledgeModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedKnowledgeItem(null);
                }}
                knowledgeItem={selectedKnowledgeItem}
                onSave={handleEditKnowledge}
                onDelete={handleDelete}
            />
        </div>
    );
}
