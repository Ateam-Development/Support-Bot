"use client";
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function EditSectionDrawer({ isOpen, onClose, onSubmit, sources = [], section, chatbotId, user }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        selectedSources: [],
        tone: 'Neutral',
        allowedTopics: '',
        blockedTopics: ''
    });

    // Populate form when section changes
    useEffect(() => {
        if (section) {
            setFormData({
                name: section.name || '',
                description: section.description || '',
                selectedSources: section.sources || [],
                tone: section.tone || 'Neutral',
                allowedTopics: section.scope?.allowed?.join(', ') || '',
                blockedTopics: section.scope?.blocked?.join(', ') || ''
            });
        }
    }, [section]);

    if (!isOpen) return null;

    const tones = [
        { name: 'Strict', description: 'Fact-based. Only answer if fully confident. No small talk.', color: 'text-red-400 border-red-500/50' },
        { name: 'Neutral', description: 'Professional, concise, and direct.', color: 'text-blue-400 border-blue-500/50' },
        { name: 'Friendly', description: 'Warm and conversational. Good for general FAQ.', color: 'text-green-400 border-green-500/50' },
        { name: 'Empathetic', description: 'Support-first, apologetic, and calming.', color: 'text-purple-400 border-purple-500/50' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const sectionData = {
                name: formData.name,
                description: formData.description,
                sources: formData.selectedSources,
                tone: formData.tone,
                scope: {
                    allowed: formData.allowedTopics.split(',').map(t => t.trim()).filter(Boolean),
                    blocked: formData.blockedTopics.split(',').map(t => t.trim()).filter(Boolean)
                }
            };

            await onSubmit(sectionData);
            onClose();
        } catch (error) {
            console.error('Error updating section:', error);
            setError(error.message || 'Failed to update section');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white">Edit Section</h2>
                        <p className="text-sm text-gray-500">Update section configuration and behavior.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <form id="edit-section-form" onSubmit={handleSubmit} className="space-y-8">
                        {/* BASICS */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Basics</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Section Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                                        placeholder="e.g. FAQ, Pricing, Troubleshooting"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors h-24 resize-none"
                                        placeholder="When should the AI use this? Used by the routing model to decide when to activate this section."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* DATA SOURCES */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Sources</h3>
                                <span className="text-xs text-gray-500">{formData.selectedSources.length} attached</span>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <select
                                    className="w-full bg-transparent text-white outline-none"
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value && !formData.selectedSources.includes(value)) {
                                            setFormData({
                                                ...formData,
                                                selectedSources: [...formData.selectedSources, value]
                                            });
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="" disabled>Select knowledge sources...</option>
                                    {sources.map(source => (
                                        <option key={source.id} value={source.id} className="bg-black text-white">
                                            {source.metadata?.title || source.metadata?.url || source.metadata?.filename || 'Untitled'} ({source.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Sources Tags */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {formData.selectedSources.map(sourceId => {
                                    const source = sources.find(s => s.id === sourceId);
                                    return (
                                        <div key={sourceId} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs text-gray-300 border border-white/5">
                                            <span className="truncate max-w-[150px]">
                                                {source?.metadata?.title || source?.metadata?.url || source?.metadata?.filename || 'Unknown'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    selectedSources: formData.selectedSources.filter(id => id !== sourceId)
                                                })}
                                                className="hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* TONE */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Tone</h3>
                            <div className="space-y-3">
                                {tones.map((tone) => (
                                    <label
                                        key={tone.name}
                                        className={`
                                            flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all
                                            ${formData.tone === tone.name
                                                ? `bg-white/5 border-${tone.color.split(' ')[0].replace('text-', '')}`
                                                : 'border-white/5 hover:bg-white/5 hover:border-white/10'}
                                        `}
                                    >
                                        <div className="flex items-center h-5">
                                            <input
                                                type="radio"
                                                name="tone"
                                                value={tone.name}
                                                checked={formData.tone === tone.name}
                                                onChange={() => setFormData({ ...formData, tone: tone.name })}
                                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-sm ${formData.tone === tone.name ? 'text-white' : 'text-gray-400'}`}>
                                                    {tone.name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{tone.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* SCOPE RULES */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Scope Rules</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Allowed Topics</label>
                                    <input
                                        type="text"
                                        value={formData.allowedTopics}
                                        onChange={e => setFormData({ ...formData, allowedTopics: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-white/20 text-sm"
                                        placeholder="e.g. pricing, refunds"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Blocked Topics</label>
                                    <input
                                        type="text"
                                        value={formData.blockedTopics}
                                        onChange={e => setFormData({ ...formData, blockedTopics: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-white/20 text-sm"
                                        placeholder="e.g. competitors"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        form="edit-section-form"
                        disabled={loading || !formData.name}
                        className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Update Section
                    </button>
                </div>
            </div>
        </div>
    );
}
