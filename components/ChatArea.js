import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2, X } from 'lucide-react';

const ChatArea = ({ primaryColor = 'blue', welcomeMessage, chatbotId, user, theme = 'black' }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sections, setSections] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [loadingSections, setLoadingSections] = useState(false);
    const messagesEndRef = useRef(null);

    // Map color names to Tailwind classes
    const colorMap = {
        blue: 'bg-blue-600',
        purple: 'bg-purple-600',
        green: 'bg-green-600',
        orange: 'bg-orange-600',
        red: 'bg-red-600',
    };

    const bgColor = colorMap[primaryColor] || 'bg-blue-600';

    // Theme-based colors
    const isWhiteTheme = theme === 'white';
    const bgMain = isWhiteTheme ? 'bg-white' : 'bg-[#0a0a0a]';
    const textPrimary = isWhiteTheme ? 'text-gray-900' : 'text-white';
    const textSecondary = isWhiteTheme ? 'text-gray-600' : 'text-gray-400';
    const borderColor = isWhiteTheme ? 'border-gray-200' : 'border-white/10';
    const inputBg = isWhiteTheme ? 'bg-gray-50' : 'bg-[#0a0a0a]';
    const inputBorder = isWhiteTheme ? 'border-gray-300' : 'border-white/10';
    const inputFocusBorder = isWhiteTheme ? 'border-gray-400' : 'border-white/20';
    const placeholderColor = isWhiteTheme ? 'placeholder-gray-400' : 'placeholder-gray-700';

    // Fetch sections when chatbotId and user are available
    useEffect(() => {
        if (chatbotId && user) {
            fetchSections();
        }
    }, [chatbotId, user]);

    useEffect(() => {
        // Reset or set initial message when welcome message changes
        if (welcomeMessage) {
            setMessages([
                { id: 'welcome', role: 'assistant', content: welcomeMessage }
            ]);
        }
    }, [welcomeMessage]);

    const fetchSections = async () => {
        if (!chatbotId || !user) return;

        setLoadingSections(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/sections/${chatbotId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setSections(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch sections:', error);
        } finally {
            setLoadingSections(false);
        }
    };

    const handleSectionClick = (section) => {
        setActiveSection(section);
        const sectionMsg = {
            id: `section-${Date.now()}`,
            role: 'assistant',
            content: `Ask about ${section.name} now!`,
            isSystemMessage: true
        };
        setMessages(prev => [...prev, sectionMsg]);
    };

    const handleExitSection = () => {
        setActiveSection(null);
        const exitMsg = {
            id: `exit-${Date.now()}`,
            role: 'assistant',
            content: welcomeMessage || 'How can I help you?',
            isSystemMessage: true
        };
        setMessages(prev => [...prev, exitMsg]);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/chat/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    chatbotId,
                    message: input,
                    sectionId: activeSection?.id || null
                })
            });

            const data = await res.json();

            if (data.success) {
                const aiMsg = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: data.data.message,
                    isError: data.data.isError || false
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                const errorMsg = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Sorry, I encountered an error processing your message.',
                    isError: true
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your message.',
                isError: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex-1 flex flex-col h-full ${bgMain}`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                        {/* Avatar */}
                        {msg.role === 'assistant' && (
                            <div className={`
                                w-8 h-8 rounded-full flex-none flex items-center justify-center shadow-lg
                                ${bgColor} text-white
                            `}>
                                <Bot className="w-5 h-5" />
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`
                                px-6 py-4 rounded-2xl text-sm font-medium shadow-md leading-relaxed
                                ${msg.role === 'assistant'
                                    ? isWhiteTheme
                                        ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                                        : 'bg-white text-gray-800 rounded-tl-none'
                                    : `${bgColor} text-white rounded-tr-none`}
                                ${msg.isError ? 'border-2 border-red-500' : ''}
                            `}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {/* Sections Chips (Only for welcome message) */}
                            {msg.id === 'welcome' && sections.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {sections.map(section => (
                                        <button
                                            key={section.id}
                                            onClick={() => handleSectionClick(section)}
                                            className={`
                                                text-xs px-3 py-1.5 rounded-full border transition-all
                                                ${activeSection?.id === section.id
                                                    ? `${bgColor} text-white border-transparent shadow-lg`
                                                    : isWhiteTheme
                                                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'
                                                        : 'bg-white/10 hover:bg-white/20 text-gray-300 border-white/10'}
                                            `}
                                        >
                                            {section.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-4 max-w-3xl">
                        <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center shadow-lg ${bgColor}`}>
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-none ${isWhiteTheme ? 'bg-gray-100 border border-gray-200' : 'bg-white border border-white/5'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Active Section Banner */}
            {activeSection && (
                <div className={`px-6 py-3 border-t ${borderColor} flex items-center justify-between ${isWhiteTheme ? 'bg-blue-50' : 'bg-blue-900/20'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bgColor}`}></div>
                        <span className={`text-sm font-medium ${textPrimary}`}>
                            Asking about: <span className="font-bold">{activeSection.name}</span>
                        </span>
                    </div>
                    <button
                        onClick={handleExitSection}
                        className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isWhiteTheme ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`}
                    >
                        <X className="w-3 h-3" />
                        Exit
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="p-6">
                <div className="max-w-3xl mx-auto relative group">
                    <div className={`relative ${inputBg} rounded-xl flex items-center p-2 border ${inputBorder} focus-within:${inputFocusBorder} transition-colors`}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={activeSection ? `Ask about ${activeSection.name}...` : "Type your message..."}
                            className={`w-full bg-transparent ${textPrimary} ${placeholderColor} px-4 py-2.5 focus:outline-none text-sm font-medium`}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${isWhiteTheme ? 'text-gray-500 hover:text-gray-900 disabled:hover:text-gray-500' : 'text-gray-500 hover:text-white disabled:hover:text-gray-500'}`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatArea;
