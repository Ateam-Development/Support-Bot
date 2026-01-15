"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbot } from '@/contexts/ChatbotContext';
import { useRouter } from 'next/navigation';
import CreateSectionDrawer from '@/components/sections/CreateSectionDrawer';
import EditSectionDrawer from '@/components/sections/EditSectionDrawer';

export default function SectionsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { selectedChatbot } = useChatbot();

    const [sections, setSections] = useState([]);
    const [knowledgeSources, setKnowledgeSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [editingSection, setEditingSection] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (selectedChatbot && user) {
            fetchData();
        }
    }, [selectedChatbot, user]);

    const fetchData = async () => {
        if (!selectedChatbot?.id || !user) return;

        setLoading(true);
        try {
            const token = await user.getIdToken();

            // Fetch sections
            const sectionsRes = await fetch(`/api/sections/${selectedChatbot.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sectionsData = await sectionsRes.json();
            if (sectionsData.success) {
                setSections(sectionsData.data || []);
            }

            // Fetch knowledge sources
            const knowledgeRes = await fetch(`/api/knowledge/${selectedChatbot.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const knowledgeData = await knowledgeRes.json();
            if (knowledgeData.success) {
                setKnowledgeSources(knowledgeData.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSection = async (sectionData) => {
        if (!selectedChatbot?.id || !user) return;

        const token = await user.getIdToken();
        const res = await fetch(`/api/sections/${selectedChatbot.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sectionData)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to create section');
        fetchData(); // Refresh list
    };

    const handleEditSection = (section) => {
        setEditingSection(section);
        setIsEditDrawerOpen(true);
    };

    const handleUpdateSection = async (sectionData) => {
        if (!selectedChatbot?.id || !user || !editingSection) return;

        const token = await user.getIdToken();
        const res = await fetch(`/api/sections/${selectedChatbot.id}/${editingSection.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sectionData)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to update section');
        fetchData(); // Refresh list
        setIsEditDrawerOpen(false);
        setEditingSection(null);
    };

    const handleDeleteSection = async (sectionId) => {
        if (!selectedChatbot?.id || !user) return;
        if (!confirm('Are you sure you want to delete this section?')) return;

        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/sections/${selectedChatbot.id}/${sectionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchData(); // Refresh list
            }
        } catch (error) {
            console.error('Failed to delete section:', error);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!user || !selectedChatbot) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">Please select a chatbot first</p>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <header className="flex justify-between items-center mb-8">
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

            {/* Sections List */}
            <div className="grid gap-4">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                        <div>
                            <h3 className="text-white font-semibold text-lg">{section.name}</h3>
                            <p className="text-gray-400 text-sm mt-1">{section.description}</p>
                            <div className="flex gap-2 mt-3">
                                <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400 border border-white/5">
                                    Tone: {section.tone}
                                </span>
                                <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400 border border-white/5">
                                    {section.sources?.length || 0} Sources
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEditSection(section)}
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
                    </motion.div>
                ))}

                {sections.length === 0 && (
                    <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <Plus className="w-6 h-6 text-gray-600" />
                        </div>
                        <h3 className="text-white font-medium mb-1">No sections defined yet</h3>
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline"
                        >
                            Create your first section
                        </button>
                    </div>
                )}
            </div>

            <CreateSectionDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSubmit={handleCreateSection}
                sources={knowledgeSources}
                chatbotId={selectedChatbot.id}
                user={user}
            />

            <EditSectionDrawer
                isOpen={isEditDrawerOpen}
                onClose={() => {
                    setIsEditDrawerOpen(false);
                    setEditingSection(null);
                }}
                onSubmit={handleUpdateSection}
                sources={knowledgeSources}
                section={editingSection}
                chatbotId={selectedChatbot.id}
                user={user}
            />
        </div>
    );
}
