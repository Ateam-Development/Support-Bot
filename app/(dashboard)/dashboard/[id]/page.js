"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Globe,
    FileText,
    Upload,
    Check,
    Copy,
    ArrowRight,
    Plus,
    Loader2,
    MessageSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { user } = useAuth();

    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data states
    const [stats, setStats] = useState({
        pages: 0,
        texts: 0,
        uploads: 0
    });
    const [recentChats, setRecentChats] = useState([]);
    const [sections, setSections] = useState([]);

    useEffect(() => {
        if (id && user) {
            fetchDashboardData();
        }
    }, [id, user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await user.getIdToken();

            // Fetch all data in parallel
            const [knowledgeRes, conversationsRes, sectionsRes] = await Promise.all([
                fetch(`/api/knowledge/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/conversations/${id}?limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/sections/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            // Parse responses
            const knowledgeData = await knowledgeRes.json();
            const conversationsData = await conversationsRes.json();
            const sectionsData = await sectionsRes.json();

            // Process knowledge base stats
            if (knowledgeData.success) {
                const knowledge = knowledgeData.data;
                const counts = {
                    pages: knowledge.filter(k => k.type === 'website').length,
                    texts: knowledge.filter(k => k.type === 'text').length,
                    uploads: knowledge.filter(k => k.type === 'file').length
                };
                setStats(counts);
            }

            // Process conversations
            if (conversationsData.success) {
                setRecentChats(conversationsData.data);
            }

            // Process sections
            if (sectionsData.success) {
                setSections(sectionsData.data);
            }

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`<script src="https://oneminute-support.vercel.app/widget.js" data-id="${id}" defer></script>`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';

        // Handle Firestore timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-3 gap-6 h-[500px]">
                {/* Left Column */}
                <div className="col-span-2 flex flex-col gap-6">
                    {/* Knowledge Base */}
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Knowledge Base</h2>
                            <Link
                                href={`/knowledge/${id}`}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium text-white rounded-lg border border-white/10 transition-colors"
                            >
                                Manage sources
                            </Link>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2 text-blue-400">
                                    <Globe className="w-4 h-4" />
                                    <span className="text-sm font-medium">Pages</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{stats.pages}</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2 text-purple-400">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-sm font-medium">Manual Texts</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{stats.texts}</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2 text-green-400">
                                    <Upload className="w-4 h-4" />
                                    <span className="text-sm font-medium">Uploads</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{stats.uploads}</div>
                            </div>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-white">Sections</h2>
                            <Link
                                href={`/sections/${id}`}
                                className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Create Section
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">configure behavior for different topics</p>

                        {sections.length > 0 ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                {sections.map((section) => (
                                    <Link
                                        key={section.id}
                                        href={`/sections/${id}`}
                                        className="block bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 transition-colors"
                                    >
                                        <h3 className="text-white font-medium text-sm mb-1">{section.name}</h3>
                                        {section.description && (
                                            <p className="text-gray-400 text-xs line-clamp-2">{section.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-gray-500">Tone: {section.tone || 'Neutral'}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                                No sections configured yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Recent Chats */}
                    <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Recent Chats</h2>
                            <Link
                                href={`/conversations/${id}`}
                                className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {recentChats.length > 0 ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                {recentChats.map((chat) => (
                                    <Link
                                        key={chat.id}
                                        href={`/conversations/${id}`}
                                        className="block bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                <MessageSquare className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-gray-400">
                                                        {chat.userId === 'Anonymous' ? 'Anonymous User' : chat.userId}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatTimestamp(chat.updatedAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white line-clamp-2">
                                                    {chat.lastMessage || 'No messages'}
                                                </p>
                                                <span className="text-xs text-gray-500 mt-1 inline-block">
                                                    {chat.messageCount} {chat.messageCount === 1 ? 'message' : 'messages'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                                No chats yet.
                            </div>
                        )}
                    </div>

                    {/* Install Widget */}
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-2">Install Widget</h2>
                        <p className="text-sm text-gray-500 mb-4">Add this snippet to your website appropriate page.</p>

                        <div className="bg-black/50 rounded-xl border border-white/5 p-4 relative group">
                            <code className="text-xs text-gray-400 font-mono break-all line-clamp-3">
                                &lt;script src="https://oneminute-support.vercel.app/widget.js" data-id="{id}" defer&gt;&lt;/script&gt;
                            </code>
                            <button
                                onClick={handleCopy}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors opacity-0 group-hover:opacity-100"
                            >
                                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
