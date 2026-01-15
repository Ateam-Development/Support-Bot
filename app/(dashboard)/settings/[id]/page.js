
"use client";
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Globe, Clock, AlertTriangle, Check, RotateCcw, Monitor } from 'lucide-react';
import { useChatbot } from '@/contexts/ChatbotContext';

export default function SettingsPage() {
    // Context
    const { chatbots, selectedChatbot, updateChatbot, deleteChatbot: contextDeleteChatbot } = useChatbot();

    // Local State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timezone, setTimezone] = useState('');

    // Edit States
    const [editingWorkspaceName, setEditingWorkspaceName] = useState(false);
    const [tempWorkspaceName, setTempWorkspaceName] = useState('');

    // Inputs for new origins: { chatbotId: { name: "", url: "" } }
    const [originInputs, setOriginInputs] = useState({});

    const [deleteInputs, setDeleteInputs] = useState({}); // { chatbotId: "typed name" }

    // Fetch Workspace Data
    useEffect(() => {
        fetchWorkspace();

        // Realtime Clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Timezone
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = new Date().toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ')[2];
            setTimezone(`${tz} (${offset || 'GMT'})`);
        } catch (e) {
            setTimezone('Local Time');
        }

        return () => clearInterval(timer);
    }, []);

    const fetchWorkspace = async () => {
        try {
            setLoadingWorkspace(true);
            const res = await fetch('/api/workspace');

            if (res.ok) {
                const wsData = await res.json();
                setWorkspace(wsData.data);
                setTempWorkspaceName(wsData.data.name);
            }
        } catch (error) {
            console.error('Error fetching workspace settings:', error);
        } finally {
            setLoadingWorkspace(false);
        }
    };

    // Workspace Name Handlers
    const saveWorkspaceName = async () => {
        if (!tempWorkspaceName.trim()) return;

        try {
            const res = await fetch('/api/workspace', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tempWorkspaceName })
            });

            if (res.ok) {
                setWorkspace(prev => ({ ...prev, name: tempWorkspaceName }));
                setEditingWorkspaceName(false);
            }
        } catch (error) {
            console.error('Error saving workspace name:', error);
        }
    };

    // Chatbot Origin Handlers
    const handleOriginInputChange = (chatbotId, field, value) => {
        setOriginInputs(prev => ({
            ...prev,
            [chatbotId]: {
                ...(prev[chatbotId] || { name: '', url: '' }),
                [field]: value
            }
        }));
    };

    const addOrigin = async (chatbotId, currentOrigins) => {
        const input = originInputs[chatbotId];
        if (!input || !input.url) return;

        // Default name if empty
        const name = input.name.trim() || 'Website';
        let url = input.url.trim();

        // Basic URL fix
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        const newOriginObj = { name, url };

        // Handle migration from old string[] to new object[]
        const normalizedOrigins = (currentOrigins || []).map(o =>
            typeof o === 'string' ? { name: 'Legacy Site', url: o } : o
        );

        const newOrigins = [...normalizedOrigins, newOriginObj];

        try {
            await updateChatbot(chatbotId, { allowedOrigins: newOrigins });

            // Clear input
            setOriginInputs(prev => ({
                ...prev,
                [chatbotId]: { name: '', url: '' }
            }));
        } catch (error) {
            console.error('Error adding origin:', error);
            alert('Failed to add site. Please try again.');
        }
    };

    const removeOrigin = async (chatbotId, currentOrigins, originUrlToRemove) => {
        try {
            // Handle both string and object structures during transition
            const normalizedOrigins = (currentOrigins || []).map(o =>
                typeof o === 'string' ? { name: 'Legacy Site', url: o } : o
            );

            const newOrigins = normalizedOrigins.filter(o => o.url !== originUrlToRemove);
            await updateChatbot(chatbotId, { allowedOrigins: newOrigins });
        } catch (error) {
            console.error('Error removing origin:', error);
            alert('Failed to remove site. Please try again.');
        }
    };

    // Delete Chatbot Handlers
    const handleDeleteChatbot = async (chatbotId) => {
        if (!confirm('Are you absolutely sure? This action cannot be undone.')) return;

        try {
            await contextDeleteChatbot(chatbotId);
            // State updates automatically via context
        } catch (error) {
            console.error('Error deleting chatbot:', error);
            alert('Failed to delete chatbot. Please try again.');
        }
    };



    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Workspace Settings</h1>
                    <p className="text-gray-400">Manage your organization and chatbot deployments.</p>
                </div>

                {/* Realtime Clock & Timezone */}
                <div className="bg-white/5 border border-white/5 rounded-xl px-5 py-3 flex items-center gap-4 shadow-lg">
                    <div className="text-right">
                        <div className="text-2xl font-mono text-white font-medium">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-xs text-blue-400 font-medium uppercase tracking-wider mt-1">
                            {timezone}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl space-y-8">

                {/* Workspace Name */}
                <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-400" />
                        General Information
                    </h2>

                    <div className="max-w-xl">
                        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider text-xs">Workspace Name</label>
                        <div className="flex gap-3">
                            {editingWorkspaceName ? (
                                <>
                                    <input
                                        type="text"
                                        value={tempWorkspaceName}
                                        onChange={(e) => setTempWorkspaceName(e.target.value)}
                                        className="flex-1 bg-black/50 border border-blue-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                        placeholder="Enter workspace name"
                                        autoFocus
                                    />
                                    <button
                                        onClick={saveChatbotName}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-600/20"
                                        title="Confirm Change"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingWorkspaceName(false);
                                            setTempWorkspaceName(workspace.name);
                                        }}
                                        className="bg-white/5 hover:bg-white/10 text-gray-400 px-4 rounded-xl flex items-center justify-center transition-colors"
                                        title="Cancel"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 flex justify-between items-center bg-black/20 border border-white/10 rounded-xl px-4 py-3 group hover:border-white/20 transition-all">
                                    <span className="text-white font-medium text-lg">{selectedChatbot?.name || 'Loading...'}</span>
                                    <button
                                        onClick={() => setEditingWorkspaceName(true)}
                                        className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Chatbot Site Mapping */}
                <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-purple-400" />
                        Deployed Sites
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">Connect your chatbots to specific websites. Add the site name and URL.</p>

                    <div className="space-y-6">
                        {(!chatbots || chatbots.length === 0) ? (
                            <div className="text-center py-12 text-gray-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
                                No chatbots found. Create one to manage deployments.
                            </div>
                        ) : (
                            chatbots.map(bot => (
                                <div key={bot.id} className="bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
                                            style={{ backgroundColor: bot.primaryColor || '#3B82F6', color: '#fff' }}
                                        >
                                            {bot.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{bot.name}</h3>
                                            <div className="text-xs text-gray-500 font-mono mt-1">ID: {bot.id}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pl-4 border-l border-white/5 ml-6">
                                        {/* Existing Origins List */}
                                        <div className="space-y-2">
                                            {(!bot.allowedOrigins || bot.allowedOrigins.length === 0) && (
                                                <div className="text-sm text-yellow-500/60 italic flex items-center gap-2 py-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Not restricted to any specific site.
                                                </div>
                                            )}

                                            {bot.allowedOrigins && bot.allowedOrigins.length > 0 && bot.allowedOrigins.map((origin, idx) => {
                                                const isObject = typeof origin === 'object';
                                                const name = isObject ? origin.name : 'Legacy Site';
                                                const url = isObject ? origin.url : origin;

                                                return (
                                                    <div key={idx} className="flex items-center justification-between bg-black/30 border border-white/5 rounded-lg p-3 group">
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-white">{name}</div>
                                                            <div className="text-xs text-blue-400 font-mono truncate max-w-[300px]">{url}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeOrigin(bot.id, bot.allowedOrigins, url)}
                                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"
                                                            title="Remove Site"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add New Origin Inputs */}
                                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                            <input
                                                type="text"
                                                placeholder="Site Name (e.g. Acme Corp)"
                                                value={originInputs[bot.id]?.name || ''}
                                                onChange={(e) => handleOriginInputChange(bot.id, 'name', e.target.value)}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                            />
                                            <input
                                                type="text"
                                                placeholder="URL (e.g. acme.com)"
                                                value={originInputs[bot.id]?.url || ''}
                                                onChange={(e) => handleOriginInputChange(bot.id, 'url', e.target.value)}
                                                className="flex-[2] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                            />
                                            <button
                                                onClick={() => addOrigin(bot.id, bot.allowedOrigins)}
                                                disabled={!originInputs[bot.id]?.url}
                                                className="bg-purple-600/20 hover:bg-purple-600/30 disabled:opacity-30 disabled:cursor-not-allowed text-purple-300 border border-purple-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                            >
                                                + Add Site
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-red-500 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </h2>
                    <p className="text-red-400/60 text-sm mb-6">Irreversible actions. Access with caution.</p>

                    <div className="space-y-4">
                        {(!chatbots || chatbots.length === 0) ? (
                            <div className="text-sm text-gray-500 italic">No chatbots available to delete.</div>
                        ) : (
                            chatbots.map(bot => (
                                <div key={bot.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                                    <div>
                                        <h4 className="text-red-200 font-medium">Delete {bot.name}</h4>
                                        <p className="text-red-400/50 text-xs mt-1">
                                            Permanently removes the chatbot, all conversations, and knowledge base data.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder={`Type "${bot.name}"`}
                                            value={deleteInputs[bot.id] || ''}
                                            onChange={(e) => setDeleteInputs(prev => ({ ...prev, [bot.id]: e.target.value }))}
                                            className="bg-black/20 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-200 placeholder-red-900/50 focus:outline-none focus:border-red-500/50 transition-all font-mono w-48"
                                        />
                                        <button
                                            onClick={() => handleDeleteChatbot(bot.id)}
                                            disabled={deleteInputs[bot.id] !== bot.name}
                                            className="bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
