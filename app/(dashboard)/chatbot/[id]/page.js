"use client";
import React, { useState, useEffect } from 'react';
import ChatArea from '@/components/ChatArea';
import { RefreshCw, Copy, Check, Save, Loader2, Palette, CodeXml, Bot, Sparkles, Cpu, Key, ShieldCheck } from 'lucide-react';
import Loader from '@/components/Loader';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatbotPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { user } = useAuth();

    const [chatbot, setChatbot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('blue');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [theme, setTheme] = useState('black');
    const [provider, setProvider] = useState('gemini'); // 'gemini' | 'openai' | 'mistral'
    const [modelName, setModelName] = useState('gemini-2.5-flash');
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

    const modelOptions = {
        gemini: [
            {
                id: 'gemini-2.5-flash',
                name: 'Gemini 2.5 Flash',
                tag: 'FREE TIER',
                isFree: true,
                desc: 'Ultra-fast & smart (Free on Google AI Studio keys)'
            },
            {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                tag: 'FREE TIER',
                isFree: true,
                desc: 'Fast multimodal response (Free on Google AI Studio)'
            },
            {
                id: 'gemini-1.5-pro',
                name: 'Gemini 1.5 Pro',
                tag: 'FREE TIER',
                isFree: true,
                desc: 'Deep reasoning (Free with rate limits on Google AI Studio)'
            }
        ],
        mistral: [
            {
                id: 'mistral-small-latest',
                name: 'Mistral Small',
                tag: 'FREE TIER',
                isFree: true,
                desc: 'Fast & low latency (Works on Free Mistral API Keys)'
            },
            {
                id: 'open-mistral-7b',
                name: 'Open Mistral 7B',
                tag: 'FREE TIER',
                isFree: true,
                desc: 'Efficient foundation model (Works on Free Mistral tier)'
            },
            {
                id: 'mistral-large-latest',
                name: 'Mistral Large',
                tag: 'PAID PLAN ONLY',
                isFree: false,
                desc: 'Flagship reasoning (Requires paid Mistral billing subscription)'
            }
        ],
        openai: [
            {
                id: 'gpt-4o-mini',
                name: 'GPT-4o Mini',
                tag: 'PAID (LOW COST)',
                isFree: false,
                desc: 'Fast & economical (~$0.15/1M tokens, requires OpenAI credits)'
            },
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                tag: 'PAID (FLAGSHIP)',
                isFree: false,
                desc: 'Top intelligence model (Requires paid OpenAI credits)'
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                tag: 'PAID',
                isFree: false,
                desc: 'Legacy fast model (Requires paid OpenAI credits)'
            }
        ]
    };

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
                setName(bot.name || 'AI Assistant');
                setPrimaryColor(bot.primaryColor || 'blue');
                setWelcomeMessage(bot.welcomeMessage || 'Hello! How can I help you today?');
                setTheme(bot.theme || 'black');
                
                // Active Provider & Model
                const currentProvider = (bot.provider || bot.model || 'gemini').toLowerCase();
                const resolvedProvider = currentProvider.startsWith('gpt') || currentProvider === 'openai' ? 'openai' : (currentProvider.startsWith('mistral') ? 'mistral' : 'gemini');
                setProvider(resolvedProvider);
                setModelName(bot.modelName || (resolvedProvider === 'openai' ? 'gpt-4o-mini' : (resolvedProvider === 'mistral' ? 'mistral-large-latest' : 'gemini-2.5-flash')));

                setOpenaiApiKey(bot.openaiApiKey || '');
                setGeminiApiKey(bot.geminiApiKey || '');
                setMistralApiKey(bot.mistralApiKey || '');
                setSystemMessage(bot.systemMessage || 'You are a helpful assistant.');
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch chatbot:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        if (newProvider === 'openai') setModelName('gpt-4o-mini');
        else if (newProvider === 'mistral') setModelName('mistral-large-latest');
        else setModelName('gemini-2.5-flash');
    };

    const saveChanges = async () => {
        setSaving(true);
        setSavedSuccess(false);
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
                    provider,
                    model: provider,
                    modelName,
                    openaiApiKey,
                    geminiApiKey,
                    mistralApiKey,
                    systemMessage
                })
            });

            const data = await res.json();
            if (data.success) {
                setChatbot(data.data);
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Failed to update:', error);
            alert('Failed to save settings: ' + error.message);
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
                <Loader />
            </div>
        );
    }

    if (!chatbot) return null;

    return (
        <div className="p-8 h-full overflow-hidden flex flex-col">
            <header className="mb-8 flex-none flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Chatbot Studio & Playground</h1>
                    <p className="text-gray-400 text-sm">Customize LLM model (ChatGPT, Gemini, Mistral), RAG instructions, and embed code.</p>
                </div>

                <div className="flex items-center gap-3">
                    {savedSuccess && (
                        <span className="text-xs text-green-400 flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                            <Check className="w-3.5 h-3.5" /> Changes Saved
                        </span>
                    )}
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Settings
                    </button>
                </div>
            </header>

            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Test Environment (Chat Area) */}
                <div className={`flex-1 border border-white/10 rounded-2xl overflow-hidden flex flex-col relative ${theme === 'white' ? 'bg-white' : 'bg-[#0a0a0a]'}`}>
                    <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className={`text-sm font-semibold ${theme === 'white' ? 'text-gray-900' : 'text-white'}`}>
                                Live Playground
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                                {provider}: {modelName}
                            </span>
                        </div>
                        <button
                            className={`flex items-center gap-2 text-xs font-medium transition-colors ${theme === 'white' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Reset Chat
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

                {/* Configuration Panel */}
                <div className="w-[430px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
                    {/* 1. AI Model & Provider Selector */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-xs tracking-wider uppercase text-blue-400">
                            <Cpu className="w-4 h-4" />
                            Active AI Model (LLM Provider)
                        </h3>

                        {/* Provider Cards */}
                        <div className="grid grid-cols-3 gap-2.5 mb-5">
                            <button
                                type="button"
                                onClick={() => handleProviderChange('openai')}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                    provider === 'openai'
                                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <span className="font-bold text-sm">ChatGPT</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">Paid Credits</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleProviderChange('gemini')}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                    provider === 'gemini'
                                        ? 'bg-blue-500/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <span className="font-bold text-sm">Gemini</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Free Tier</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleProviderChange('mistral')}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                    provider === 'mistral'
                                        ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <span className="font-bold text-sm">Mistral</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">Free & Paid</span>
                            </button>
                        </div>

                        {/* Model Variant Dropdown */}
                        <div className="mb-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-gray-400">
                                    Model Version & Pricing Tier
                                </label>
                            </div>
                            <select
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                className="w-full bg-[#141414] border border-white/15 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                            >
                                {(modelOptions[provider] || []).map((m) => (
                                    <option key={m.id} value={m.id} className="bg-[#141414] text-white py-1">
                                        [{m.tag}] {m.name} — {m.desc}
                                    </option>
                                ))}
                            </select>

                            {/* Dynamic Free / Paid Status Card */}
                            {(() => {
                                const activeModel = (modelOptions[provider] || []).find(m => m.id === modelName) || (modelOptions[provider] || [])[0];
                                if (!activeModel) return null;

                                return (
                                    <div className={`mt-3 p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all ${
                                        activeModel.isFree
                                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                            : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                                    }`}>
                                        <div className="flex items-center justify-between font-semibold">
                                            <span className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${activeModel.isFree ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                                                {activeModel.name}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                activeModel.isFree
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            }`}>
                                                {activeModel.tag}
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-gray-400">
                                            {activeModel.isFree
                                                ? '✅ Free Tier Compatible: Operates on standard free-tier API keys without requiring a paid billing plan.'
                                                : '⚠️ Paid Plan / Credits Required: Requires a funded credit balance or paid billing subscription on your provider account.'
                                            }
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* 2. API Keys Management */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-xs tracking-wider uppercase text-purple-400">
                            <Key className="w-4 h-4" />
                            Provider API Keys
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Optionally provide custom keys for this chatbot. If blank, global environment keys will be used.
                        </p>

                        <div className="space-y-3.5">
                            <div>
                                <label className="text-xs font-medium text-gray-400 flex items-center justify-between mb-1.5">
                                    <span>OpenAI API Key (ChatGPT)</span>
                                    {openaiApiKey && <span className="text-[10px] text-emerald-400">Configured</span>}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                                    value={openaiApiKey}
                                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                                    placeholder="sk-..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-400 flex items-center justify-between mb-1.5">
                                    <span>Google Gemini API Key</span>
                                    {geminiApiKey && <span className="text-[10px] text-blue-400">Configured</span>}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="AIza..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-400 flex items-center justify-between mb-1.5">
                                    <span>Mistral API Key</span>
                                    {mistralApiKey && <span className="text-[10px] text-orange-400">Configured</span>}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                                    value={mistralApiKey}
                                    onChange={(e) => setMistralApiKey(e.target.value)}
                                    placeholder="Key..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Appearance & Branding */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h3 className="text-white font-semibold mb-6 flex items-center gap-2 text-xs tracking-wider uppercase text-gray-400">
                            <Palette className="w-4 h-4" />
                            Appearance & Branding
                        </h3>

                        <div className="mb-6">
                            <label className="text-xs font-medium text-gray-400 block mb-2">Bot Name</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Assistant Name"
                            />
                        </div>

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
                            <label className="text-xs font-medium text-gray-400 block mb-2">Widget Theme</label>
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
                                rows={3}
                                value={welcomeMessage}
                                onChange={(e) => setWelcomeMessage(e.target.value)}
                                placeholder="Hello! How can I help you today?"
                            />
                        </div>
                    </div>

                    {/* 4. System Message & Instructions */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-xs tracking-wider uppercase text-gray-400">
                            <Sparkles className="w-4 h-4" />
                            System Instructions
                        </h3>

                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Persona & Rules</label>
                            <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/20 transition-all custom-scrollbar"
                                rows={4}
                                value={systemMessage}
                                onChange={(e) => setSystemMessage(e.target.value)}
                                placeholder="You are a helpful assistant. Use the knowledge base to answer questions accurately."
                            />
                        </div>
                    </div>

                    {/* 5. Embed Code */}
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-xs tracking-wider uppercase text-gray-400">
                            <CodeXml className="w-4 h-4" />
                            Embed Widget Script
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
                    </div>
                </div>
            </div>
        </div>
    );
}
