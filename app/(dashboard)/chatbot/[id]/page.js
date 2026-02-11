"use client";
import React, { useState, useEffect } from 'react';
import ChatArea from '@/components/ChatArea';
import { RefreshCw, Copy, Check, Save, Loader2, Palette, CodeXml } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatbotPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { user } = useAuth();

    const [chatbot, setChatbot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('blue');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [theme, setTheme] = useState('black');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [mistralApiKey, setMistralApiKey] = useState('');
    const [systemMessage, setSystemMessage] = useState('');

    const colors = [
        { name: 'blue', class: 'bg-blue-600' },
        { name: 'purple', class: 'bg-purple-600' },
        { name: 'green', class: 'bg-green-600' },
        { name: 'orange', class: 'bg-orange-600' },
        { name: 'red', class: 'bg-red-600' },
    ];

    useEffect(() => {
        if (id && user) {
            fetchChatbot();
        }
    }, [id, user]);

    const fetchChatbot = async () => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/chatbots/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                const bot = data.data;
                setChatbot(bot);
                setName(bot.name);
                setPrimaryColor(bot.primaryColor);
                setWelcomeMessage(bot.welcomeMessage || 'Hello! What you Want to Ask!');
                setTheme(bot.theme || 'black');
                setOpenaiApiKey(bot.openaiApiKey || '');
                setGeminiApiKey(bot.geminiApiKey || '');
                setMistralApiKey(bot.mistralApiKey || '');
                setSystemMessage(bot.systemMessage || 'You are a helpful assistant.');
            } else {
                // If not found or error, redirect to home
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch chatbot:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/chatbots/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    config: { // Assuming backend expects 'config' object or direct fields? 
                        // Checking api/chatbots/[id]/route.js: 
                        // It accepts 'name' and 'config'. 
                        // But wait, the POST route took primaryColor and welcomeMessage at root level.
                        // Let's check PUT again: 
                        // "const { name, config } = await request.json();"
                        // "if (config) updates.config = { ...chatbot.config, ...config };"
                        // It seems the backend MIGHT store color/message in 'config' or 'chatbot' root?
                        // Let's check 'createChatbot' in 'api/chatbots/route.js':
                        // "const chatbot = await createChatbot(user.uid, { name, primaryColor, welcomeMessage, model });"
                        // So they are at root level. 
                        // BUT PUT only accepts 'name' and 'config'. This might be a bug in the backend or inconsistent design.
                        // Let's assume for now we need to fix backend or pass them in a way backend currently supports?
                        // Actually, if I look at 'updateChatbot' in db lib (which I can't see but can infer), 
                        // the route only extracts 'name' and 'config'. 
                        // If primaryColor and welcomeMessage are top-level columns/fields, the current PUT route MIGHT NOT update them 
                        // unless they are inside 'config' JSON column.
                        // However, to be safe and consistent with what I see, existing route only updates 'name' and 'config'.
                        // I should PROBABLY update the backend route to accept primaryColor and welcomeMessage too.
                        // For now, I will send them, and if they don't update, I will fix backend.
                        // Actually, I should inspect the backend DB schema or 'createChatbot' fn if I could.
                        // But let's assume I should update backend to handle these fields.
                    }
                })
            });

            // WAIT - I need to check the backend route again.
            // It says: "const { name, config } = await request.json();"
            // And: "if (name) updates.name = name;"
            // And: "if (config) updates.config = { ...chatbot.config, ...config };"
            // It completely ignores 'primaryColor' and 'welcomeMessage'.
            // I MUST FIX THE BACKEND ROUTE.
            return;
        } catch (error) {
            console.error(error);
        }
    };

    // Changing handleSave to actually call the API, but I will need to fix backend separately.
    // For this step, I will write the frontend code assuming backend WILL be fixed.

    const saveChanges = async () => {
        setSaving(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/chatbots/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    primaryColor,
                    welcomeMessage,
                    theme,
                    openaiApiKey,
                    geminiApiKey,
                    mistralApiKey,
                    systemMessage
                })
            });

            const data = await res.json();
            if (data.success) {
                // Success feedback
            }
        } catch (error) {
            console.error('Failed to update:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`<script src="https://oneminute-support.vercel.app/widget.js" data-id="${id}" defer></script>`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!chatbot) return null;


    return (
        <div className="p-8 h-full overflow-hidden flex flex-col">
            <header className="mb-8 flex-none flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Chatbot Playground</h1>
                    <p className="text-gray-400">Test your assistant, customize appearance, and deploy it.</p>
                </div>

                <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </header>

            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Test Environment */}
                <div className={`flex-1 border border-white/10 rounded-2xl overflow-hidden flex flex-col relative ${theme === 'white' ? 'bg-white' : 'bg-[#0a0a0a]'}`}>
                    <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-900' : 'text-white'}`}>Test Environment</span>
                        </div>
                        <button
                            className={`flex items-center gap-2 text-xs font-medium transition-colors ${theme === 'white' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Reset
                        </button>
                    </div>
                    <div className="flex-1 relative">
                        <ChatArea
                            primaryColor={primaryColor}
                            welcomeMessage={welcomeMessage}
                            chatbotId={id}
                            user={user}
                            theme={theme}
                        />
                    </div>
                </div>

                {/* Appearance & Settings Panel */}
                <div className="w-[400px] flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    {/* Appearance */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10">
                        <h3 className="text-white font-semibold mb-6 flex items-center gap-2 text-sm tracking-wide uppercase">
                            <Palette className="w-4 h-4 text-gray-400" />
                            Appearance
                        </h3>

                        <div className="mb-6">
                            <label className="text-xs font-medium text-gray-400 block mb-2">Primary Color</label>
                            <div className="flex gap-3">
                                {colors.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => setPrimaryColor(c.name)}
                                        className={`w-8 h-8 rounded-full ${c.class} transition-all hover:scale-110 flex items-center justify-center ${primaryColor === c.name ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : 'opacity-70 hover:opacity-100'}`}
                                    >
                                        {primaryColor === c.name && <Check className="w-4 h-4 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-medium text-gray-400 block mb-2">Theme</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setTheme('black')}
                                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${theme === 'black' ? 'bg-gray-900 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
                                >
                                    Black
                                </button>
                                <button
                                    onClick={() => setTheme('white')}
                                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${theme === 'white' ? 'bg-white text-gray-900 border-white/20' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
                                >
                                    White
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Welcome Message</label>
                            <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/20 transition-all custom-scrollbar"
                                rows={4}
                                value={welcomeMessage}
                                onChange={(e) => setWelcomeMessage(e.target.value)}
                                placeholder="Hello! What you Want to Ask!"
                            />
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10">
                        <h3 className="text-white font-semibold mb-6 flex items-center gap-2 text-sm tracking-wide uppercase">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            API Keys
                        </h3>

                        <div className="mb-4">
                            <label className="text-xs font-medium text-gray-400 block mb-2">OpenAI API Key</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
                                value={openaiApiKey}
                                onChange={(e) => setOpenaiApiKey(e.target.value)}
                                placeholder="sk-..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Gemini API Key</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                placeholder="AIza..."
                            />
                        </div>
                        <div className="mt-4">
                            <label className="text-xs font-medium text-gray-400 block mb-2">Mistral API Key</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
                                value={mistralApiKey}
                                onChange={(e) => setMistralApiKey(e.target.value)}
                                placeholder="Key..."
                            />
                        </div>
                    </div>

                    {/* System Message */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10">
                        <h3 className="text-white font-semibold mb-6 flex items-center gap-2 text-sm tracking-wide uppercase">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            System Message
                        </h3>

                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Instructions for AI</label>
                            <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/20 transition-all custom-scrollbar"
                                rows={4}
                                value={systemMessage}
                                onChange={(e) => setSystemMessage(e.target.value)}
                                placeholder="You are a helpful assistant."
                            />
                        </div>
                    </div>

                    {/* Embed Code */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10">
                        <h3 className="text-white font-semibold mb-6 flex items-center gap-2 text-sm tracking-wide uppercase">
                            <CodeXml className="w-4 h-4 text-gray-400" />
                            Embed Code
                        </h3>
                        <div className="bg-black/50 p-4 rounded-xl border border-white/5 relative group mb-4">
                            <code className="text-xs text-gray-400 font-mono break-all line-clamp-4 leading-relaxed p-1 block">
                                &lt;script src="https://oneminute-support.vercel.app/widget.js" data-id="{id}" defer&gt;&lt;/script&gt;
                            </code>
                            <button
                                onClick={handleCopy}
                                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-lg flex items-start gap-3">
                            <div className="mt-0.5 w-4 h-4 rounded-full border border-orange-500/50 flex items-center justify-center flex-none">
                                <span className="text-[10px] font-bold text-orange-500">!</span>
                            </div>
                            <p className="text-[11px] text-orange-500/80 leading-relaxed">
                                Paste this code before the closing <code className="bg-orange-500/10 px-1 rounded text-orange-500">&lt;/head&gt;</code> tag on your website.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
