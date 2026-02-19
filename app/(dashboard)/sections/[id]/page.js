'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbot } from '@/contexts/ChatbotContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Loader from '@/components/Loader';
import { motion } from 'framer-motion';
import CreateSectionDrawer from '@/components/sections/CreateSectionDrawer';

export default function SectionsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { selectedChatbot, selectChatbot, chatbots } = useChatbot();

    const [sections, setSections] = useState([]);
    const [knowledgeSources, setKnowledgeSources] = useState([]); // Needed for the drawer
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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


    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();

            // Fetch sections
            const sectionsRes = await fetch(`/api/sections/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const sectionsData = await sectionsRes.json();
            if (sectionsData.success) {
                const sortedSections = (sectionsData.data || []).sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                });
                setSections(sortedSections);
            }

            // Fetch knowledge sources for the drawer
            const knowledgeRes = await fetch(`/api/knowledge/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const knowledgeData = await knowledgeRes.json();
            if (knowledgeData.success) {
                setKnowledgeSources(knowledgeData.data);
            }

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [editingSection, setEditingSection] = useState(null);

    const handleDeleteSection = async (sectionId) => {
        if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
            return;
        }

        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/sections/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sectionId })
            });

            const data = await res.json();
            if (data.success) {
                fetchData();
            } else {
                console.error('Failed to delete:', data.message);
                alert('Failed to delete section: ' + data.message);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete section');
        }
    };

    const handleEditClick = (section) => {
        setEditingSection(section);
        setIsDrawerOpen(true);
    };

    const handleSaveSection = async (sectionData) => {
        const token = await user.getIdToken();
        const method = editingSection ? 'PUT' : 'POST';
        const body = editingSection ? { ...sectionData, sectionId: editingSection.id } : sectionData;

        const res = await fetch(`/api/sections/${id}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to save section');
        fetchData(); // Refresh list
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Sections</h1>
                    <p className="text-gray-400">Define behavior and tone for different topics.</p>
                </div>
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Create Section
                </button>
            </header>

            {/* Headers Row */}
            {sections.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Sources</div>
                    <div className="col-span-2">Tone</div>
                    <div className="col-span-3">Scope</div>
                </div>
            )}

            <div className="grid gap-4">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                        <div className="grid grid-cols-12 gap-4 w-full items-center">
                            {/* Name & Desc */}
                            <div className="col-span-4 pr-4">
                                <h3 className="text-white font-semibold text-lg">{section.name}</h3>
                                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{section.description}</p>
                            </div>

                            {/* Sources Count */}
                            <div className="col-span-3 text-gray-400 text-sm">
                                {section.sources?.length || 0} Sources attached
                            </div>

                            {/* Tone */}
                            <div className="col-span-2">
                                <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400 border border-white/5">
                                    {section.tone}
                                </span>
                            </div>

                            {/* Scope */}
                            <div className="col-span-3 flex justify-between items-center">
                                <div className="text-xs text-gray-500">
                                    {section.scope?.allowed?.length || 0} Allowed, {section.scope?.blocked?.length || 0} Blocked
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditClick(section)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSection(section.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {!loading && sections.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6 text-gray-600" />
                        </div>
                        <h3 className="text-white font-medium mb-1">No sections defined yet</h3>
                        <button
                            onClick={() => {
                                setEditingSection(null);
                                setIsDrawerOpen(true);
                            }}
                            className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline"
                        >
                            Create your first section
                        </button>
                    </div>
                )}
            </div>

            <CreateSectionDrawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setEditingSection(null);
                }}
                onSubmit={handleSaveSection}
                sources={knowledgeSources}
                initialData={editingSection}
            />
        </div>
    );
}
