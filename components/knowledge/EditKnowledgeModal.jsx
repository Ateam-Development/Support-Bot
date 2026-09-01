"use client";
import React, { useState, useEffect } from 'react';
import { X, Globe, FileText, Upload, Save, Trash2, Eye, Edit3, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function EditKnowledgeModal({ isOpen, onClose, knowledgeItem, onSave, onDelete }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'preview'
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (knowledgeItem) {
            setTitle(
                knowledgeItem.metadata?.title ||
                knowledgeItem.metadata?.filename ||
                knowledgeItem.metadata?.url ||
                'Untitled Document'
            );
            setContent(knowledgeItem.content || '');
            setViewMode('edit');
            setError('');
        }
    }, [knowledgeItem]);

    if (!isOpen || !knowledgeItem) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await onSave(knowledgeItem.id, {
                title,
                content
            });
            onClose();
        } catch (err) {
            console.error('Save knowledge error:', err);
            setError(err.message || 'Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this knowledge source? This will remove its vector embeddings and cannot be undone.')) {
            return;
        }

        setDeleting(true);
        try {
            await onDelete(knowledgeItem.id);
            onClose();
        } catch (err) {
            console.error('Delete knowledge error:', err);
            setError(err.message || 'Failed to delete knowledge item');
        } finally {
            setDeleting(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'website': return <Globe className="w-5 h-5 text-blue-400" />;
            case 'file': return <Upload className="w-5 h-5 text-green-400" />;
            case 'text':
            default: return <FileText className="w-5 h-5 text-purple-400" />;
        }
    };

    const charCount = content.length;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-4xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between flex-none bg-[#0a0a0a]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                            {getIcon(knowledgeItem.type)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">
                                    Edit Knowledge Source
                                </h3>
                                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                                    {knowledgeItem.type}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">
                                {knowledgeItem.metadata?.url || knowledgeItem.metadata?.filename || 'Manual Knowledge Entry'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mr-2">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    viewMode === 'edit'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit Content
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    viewMode === 'preview'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Title Input */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Document Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Knowledge Source Title..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                                required
                            />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    Knowledge Content (Used for RAG AI Answers)
                                </label>
                                <span className="text-xs text-gray-500">
                                    {wordCount.toLocaleString()} words • {charCount.toLocaleString()} characters
                                </span>
                            </div>

                            {viewMode === 'edit' ? (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Enter or paste knowledge content..."
                                    rows={14}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm leading-relaxed placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none font-mono custom-scrollbar"
                                    required
                                />
                            ) : (
                                <div className="w-full min-h-[350px] max-h-[400px] overflow-y-auto bg-black/40 border border-white/10 rounded-xl p-5 text-gray-200 text-sm leading-relaxed custom-scrollbar prose prose-invert max-w-none">
                                    {content ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {content}
                                        </ReactMarkdown>
                                    ) : (
                                        <p className="text-gray-600 italic">No content to preview.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RAG Info Pill */}
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center gap-2.5 text-xs text-blue-400">
                            <Sparkles className="w-4 h-4 flex-none" />
                            <span>
                                Saving edits will automatically chunk, generate updated vector embeddings, and refresh RAG context for this chatbot.
                            </span>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 flex items-center justify-between flex-none bg-[#0a0a0a]">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting || loading}
                            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Source
                        </button>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading || deleting}
                                className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || deleting || !content.trim()}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Re-indexing & Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
