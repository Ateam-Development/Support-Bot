"use client";
import React, { useState } from 'react';
import { X, Globe, Loader2, AlertCircle } from 'lucide-react';

export default function AddWebsiteModal({ isOpen, onClose, onAdd }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [processingStatus, setProcessingStatus] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setProcessingStatus('Scraping website...');

        try {
            await onAdd(url);
            setUrl('');
            setProcessingStatus('');
            onClose();
        } catch (err) {
            console.error('Website add error:', err);

            // Check for specific API configuration errors
            if (err.message && err.message.includes('Firecrawl API key')) {
                setError('⚠️ Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your environment variables.');
            } else if (err.message && err.message.includes('Gemini API key')) {
                setError('⚠️ Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.');
            } else {
                setError(err.message || 'Failed to add website');
            }
            setProcessingStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Globe className="w-5 h-5 text-blue-500" />
                        </div>
                        Add Website
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Website URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                            required
                            disabled={loading}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            We will crawl this URL and add its content to your knowledge base.
                        </p>
                    </div>

                    {processingStatus && (
                        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {processingStatus}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Add Website'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
