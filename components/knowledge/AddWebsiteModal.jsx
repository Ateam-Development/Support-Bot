"use client";
import React, { useState } from 'react';
import { X, Globe, Loader2, AlertCircle, ArrowLeft, Check, Sparkles, Edit3 } from 'lucide-react';

export default function AddWebsiteModal({ isOpen, onClose, onAdd, chatbotId, user }) {
    const [step, setStep] = useState(1); // 1: Enter URL, 2: Review & Edit Content
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [processingStatus, setProcessingStatus] = useState('');

    if (!isOpen) return null;

    const handleReset = () => {
        setStep(1);
        setUrl('');
        setTitle('');
        setContent('');
        setError('');
        setProcessingStatus('');
    };

    const handleClose = () => {
        if (!loading && !saving) {
            handleReset();
            onClose();
        }
    };

    // Step 1: Crawl website and preview
    const handleCrawlPreview = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setProcessingStatus('Connecting to Firecrawl scraper...');

        try {
            const token = await user?.getIdToken?.();
            setProcessingStatus('Crawling website & structuring with AI...');

            const res = await fetch(`/api/knowledge/${chatbotId}/website/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ url })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to crawl website');
            }

            setTitle(data.data.title || 'Website Document');
            setContent(data.data.content || '');
            setStep(2); // Move to review & edit step
        } catch (err) {
            console.error('Crawl preview error:', err);
            if (err.message && err.message.includes('Firecrawl API key')) {
                setError('⚠️ Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your environment variables.');
            } else if (err.message && err.message.includes('Gemini API key')) {
                setError('⚠️ Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.');
            } else {
                setError(err.message || 'Failed to crawl website. Please check the URL.');
            }
        } finally {
            setLoading(false);
            setProcessingStatus('');
        }
    };

    // Step 2: Save reviewed/edited content to knowledge base
    const handleSaveToKnowledge = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await onAdd({
                url,
                title,
                content
            });
            handleReset();
            onClose();
        } catch (err) {
            console.error('Save knowledge error:', err);
            setError(err.message || 'Failed to add website to knowledge base');
        } finally {
            setSaving(false);
        }
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className={`w-full ${step === 1 ? 'max-w-md' : 'max-w-3xl'} bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl transition-all flex flex-col max-h-[90vh] overflow-hidden`}>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between flex-none bg-[#0a0a0a]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                {step === 1 ? 'Add Website Knowledge' : 'Review & Edit Crawled Content'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {step === 1
                                    ? 'Step 1 of 2: Enter URL to crawl'
                                    : 'Step 2 of 2: Review and edit before adding to knowledge base'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        disabled={loading || saving}
                        className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step 1: URL Input Form */}
                {step === 1 && (
                    <form onSubmit={handleCrawlPreview} className="p-6">
                        <div className="mb-6">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Website or Page URL
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/docs"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                                required
                                disabled={loading}
                                autoFocus
                            />
                            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                                We will scrape the page content and format it for you. You will be able to review and edit everything before saving.
                            </p>
                        </div>

                        {processingStatus && (
                            <div className="mb-4 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm flex items-center gap-2.5">
                                <Loader2 className="w-4 h-4 animate-spin flex-none" />
                                <span>{processingStatus}</span>
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !url}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Crawling & Structuring...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Crawl & Preview
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Review & Edit Form */}
                {step === 2 && (
                    <form onSubmit={handleSaveToKnowledge} className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            {/* URL Badge */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-400">
                                <Globe className="w-4 h-4 text-blue-400 flex-none" />
                                <span className="truncate">{url}</span>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                    Knowledge Document Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Document Title"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                                    required
                                    disabled={saving}
                                />
                            </div>

                            {/* Content Editor */}
                            <div className="flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                        <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                                        Extracted Content (Edit or refine before saving)
                                    </label>
                                    <span className="text-xs text-gray-500">
                                        {wordCount.toLocaleString()} words • {charCount.toLocaleString()} characters
                                    </span>
                                </div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Crawled content..."
                                    rows={12}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm leading-relaxed placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none font-mono custom-scrollbar"
                                    required
                                    disabled={saving}
                                />
                            </div>

                            {error && (
                                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-white/10 flex items-center justify-between flex-none bg-[#0a0a0a]">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={saving}
                                className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to URL
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={saving}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !content.trim()}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Indexing & Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Add to Knowledge Base
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
