"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Home, MessageSquare, Headset } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToMessages } from '@/lib/firebase-realtime';

const ChatWidget = ({ chatbotId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home'); // 'home' (AI) or 'chat' (Live Agent)
    const [config, setConfig] = useState(null);

    // AI Chat State (Home)
    const [aiMessages, setAiMessages] = useState([]);
    const [aiInput, setAiInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [aiConversationId, setAiConversationId] = useState(null);
    const [activeSection, setActiveSection] = useState(null); // Only for AI
    const aiMessagesEndRef = useRef(null);

    // Live Chat State (Chat)
    const [liveMessages, setLiveMessages] = useState([]);
    const [liveInput, setLiveInput] = useState('');
    const [isLiveTyping, setIsLiveTyping] = useState(false);
    const [liveConversationId, setLiveConversationId] = useState(null);
    const liveMessagesEndRef = useRef(null);

    // Color mapping
    const colorMap = {
        blue: '#2563eb',
        purple: '#9333ea',
        green: '#16a34a',
        orange: '#ea580c',
        red: '#dc2626',
    };

    const [visitorId, setVisitorId] = useState('');

    useEffect(() => {
        // Initialize/retrieve permanent visitor ID
        let storedId = localStorage.getItem('oneminute_visitor_id');
        if (!storedId) {
            storedId = `visitor_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
            localStorage.setItem('oneminute_visitor_id', storedId);
        }
        setVisitorId(storedId);
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [chatbotId]);

    // Initialize AI Chat Welcome Message
    useEffect(() => {
        if (config && aiMessages.length === 0) {
            setAiMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: config.welcomeMessage,
                    isWelcome: true
                }
            ]);
        }
    }, [config]);

    // Initialize Live Chat Welcome Message (only if no real-time messages)
    useEffect(() => {
        if (config && liveMessages.length === 0 && !liveConversationId) {
            setLiveMessages([
                {
                    id: 'live-welcome',
                    role: 'assistant',
                    content: "Hello! A support agent will be with you shortly. How can we help you?",
                    type: 'live'
                }
            ]);
        }
    }, [config, liveConversationId]);

    // Real-time listener for live chat messages
    useEffect(() => {
        if (!liveConversationId) return;

        const unsubscribe = subscribeToMessages(liveConversationId, (messages) => {
            // Filter to show only live chat messages
            const liveOnly = messages.filter(msg => msg.type === 'live');

            // Always prepend welcome message
            const welcomeMsg = {
                id: 'live-welcome',
                role: 'assistant',
                content: "Hello! A support agent will be with you shortly. How can we help you?",
                type: 'live'
            };

            setLiveMessages([welcomeMsg, ...liveOnly]);
        });

        return () => unsubscribe();
    }, [liveConversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [aiMessages, liveMessages, isAiTyping, isLiveTyping, activeTab]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/widget/${chatbotId}`);
            const data = await res.json();
            if (data.success) {
                setConfig(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    const scrollToBottom = () => {
        if (activeTab === 'home') {
            aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            liveMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleAiSend = async () => {
        if (!aiInput.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', content: aiInput };
        setAiMessages(prev => [...prev, userMsg]);
        const currentInput = aiInput;
        setAiInput('');
        setIsAiTyping(true);

        try {
            const res = await fetch(`/api/widget/${chatbotId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: currentInput,
                    sectionId: activeSection?.id || null,
                    conversationId: aiConversationId,
                    visitorId: visitorId // Send permanent ID
                })
            });

            const data = await res.json();

            if (data.success) {
                setAiConversationId(data.data.conversationId);
                const aiMsg = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: data.data.message
                };
                setAiMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleLiveSend = async () => {
        if (!liveInput.trim()) return;

        const currentInput = liveInput;
        setLiveInput('');

        try {
            const res = await fetch(`/api/widget/${chatbotId}/live-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: currentInput,
                    conversationId: liveConversationId || aiConversationId,
                    visitorId: visitorId
                })
            });

            const data = await res.json();

            if (data.success) {
                // Set conversation ID for real-time subscription
                if (!liveConversationId) {
                    setLiveConversationId(data.data.conversationId);
                }
                // Real-time listener will update messages automatically
            }
        } catch (error) {
            console.error('Live chat error:', error);
        }
    };

    const handleSectionClick = (section) => {
        if (activeSection?.id === section.id) {
            setActiveSection(null);
        } else {
            setActiveSection(section);
        }
    };

    const primaryColor = config ? colorMap[config.primaryColor] || colorMap.blue : colorMap.blue;

    if (!config) return null;

    return (
        <div className="widget-container">
            <AnimatePresence mode="wait">
                {!isOpen && (
                    <motion.button
                        key="chat-button"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="widget-button"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="widget-button-content">
                            <MessageCircle size={28} color="white" strokeWidth={2.5} />
                            {/* Notification Dot */}
                            <span className="widget-notification-dot"></span>
                        </div>
                    </motion.button>
                )}

                {isOpen && (
                    <motion.div
                        key="chat-window"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="widget-chat-window"
                    >
                        {/* Header */}
                        <div className="widget-header" style={{ backgroundColor: primaryColor }}>
                            <div className="widget-header-content">
                                <div className="widget-avatar-small" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                    {activeTab === 'home' ? <MessageCircle size={20} color="white" /> : <Headset size={20} color="white" />}
                                </div>
                                <div className="widget-header-text">
                                    <div className="widget-header-title">{activeTab === 'home' ? config.name : 'Live Support'}</div>
                                    <div className="widget-header-status">
                                        <span className="status-dot-small"></span>
                                        Online
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="widget-close-btn">
                                <X size={20} color="white" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="widget-content">

                            {/* ============ AI TAB (HOME) ============ */}
                            {activeTab === 'home' && (
                                <motion.div
                                    key="home-tab"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                                >
                                    <div className="widget-messages">
                                        {aiMessages.map((msg) => (
                                            <div key={msg.id} className={`widget-message ${msg.role}`}>
                                                {msg.role === 'assistant' && (
                                                    <div className="widget-message-avatar" style={{ backgroundColor: primaryColor }}>
                                                        <MessageCircle size={16} color="white" />
                                                    </div>
                                                )}
                                                <div className="widget-message-content">
                                                    <div className={`widget-message-bubble ${msg.role}`} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                                                        {msg.content}
                                                    </div>

                                                    {/* Show Sections ONLY on Welcome Message */}
                                                    {msg.isWelcome && config.sections && config.sections.length > 0 && (
                                                        <div className="widget-sections">
                                                            {config.sections.map(section => (
                                                                <button
                                                                    key={section.id}
                                                                    onClick={() => handleSectionClick(section)}
                                                                    className={`widget-section-chip ${activeSection?.id === section.id ? 'active' : ''}`}
                                                                    style={activeSection?.id === section.id ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor } : {}}
                                                                >
                                                                    {section.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {isAiTyping && (
                                            <div className="widget-message assistant">
                                                <div className="widget-message-avatar" style={{ backgroundColor: primaryColor }}>
                                                    <MessageCircle size={16} color="white" />
                                                </div>
                                                <div className="widget-typing">
                                                    <span></span><span></span><span></span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={aiMessagesEndRef} />
                                    </div>

                                    {/* AI Input */}
                                    <div className="widget-input-container">
                                        {activeSection && (
                                            <div className="widget-input-section-badge">
                                                <span>Topic: {activeSection.name}</span>
                                                <button onClick={() => setActiveSection(null)}><X size={10} /></button>
                                            </div>
                                        )}
                                        <div className="widget-input-wrapper">
                                            <input
                                                type="text"
                                                value={aiInput}
                                                onChange={(e) => setAiInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                                                placeholder={activeSection ? `Ask about ${activeSection.name}...` : "Ask AI anything..."}
                                                className="widget-input"
                                            />
                                            <button
                                                onClick={handleAiSend}
                                                disabled={!aiInput.trim() || isAiTyping}
                                                className="widget-send-btn"
                                                style={{ color: primaryColor }}
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============ LIVE TAB (CHAT) ============ */}
                            {activeTab === 'chat' && (
                                <motion.div
                                    key="live-tab"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                                >
                                    <div className="widget-messages">
                                        {liveMessages.map((msg) => (
                                            <div key={msg.id} className={`widget-message ${msg.role}`}>
                                                {msg.role === 'assistant' && (
                                                    <div className="widget-message-avatar" style={{ backgroundColor: '#10b981' }}> {/* Green for live agent */}
                                                        <Headset size={16} color="white" />
                                                    </div>
                                                )}
                                                <div className="widget-message-content">
                                                    <div className={`widget-message-bubble ${msg.role}`} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {isLiveTyping && (
                                            <div className="widget-message assistant">
                                                <div className="widget-message-avatar" style={{ backgroundColor: '#10b981' }}>
                                                    <Headset size={16} color="white" />
                                                </div>
                                                <div className="widget-typing">
                                                    <span></span><span></span><span></span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={liveMessagesEndRef} />
                                    </div>

                                    {/* Live Input */}
                                    <div className="widget-input-container">
                                        <div className="widget-input-wrapper">
                                            <input
                                                type="text"
                                                value={liveInput}
                                                onChange={(e) => setLiveInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLiveSend()}
                                                placeholder="Message support agent..."
                                                className="widget-input"
                                            />
                                            <button
                                                onClick={handleLiveSend}
                                                disabled={!liveInput.trim() || isLiveTyping}
                                                className="widget-send-btn"
                                                style={{ color: primaryColor }}
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Bottom Tab Bar */}
                        <div className="widget-tab-bar">
                            <button
                                className={`widget-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
                                onClick={() => setActiveTab('home')}
                                style={activeTab === 'home' ? { color: primaryColor } : {}}
                            >
                                <Home size={20} />
                                <span>Home</span>
                            </button>
                            <button
                                className={`widget-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                                onClick={() => setActiveTab('chat')}
                                style={activeTab === 'chat' ? { color: primaryColor } : {}}
                            >
                                <MessageSquare size={20} />
                                <span>Chat</span>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="widget-footer">
                            Powered by OneMinute Support
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .widget-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .widget-button {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .widget-notification-dot {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    width: 10px;
                    height: 10px;
                    background-color: #ef4444; /* Red */
                    border: 2px solid white; 
                    border-radius: 50%;
                }

                .widget-button-content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .widget-chat-window {
                    width: 380px;
                    height: 600px;
                    max-height: 80vh;
                    background: #1a1a1a;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .widget-header {
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .widget-header-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .widget-avatar-small {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .widget-header-text {
                    display: flex;
                    flex-direction: column;
                }

                .widget-header-title {
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                }

                .widget-header-status {
                    color: rgba(255,255,255,0.9);
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .status-dot-small {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background-color: #10b981;
                }

                .widget-close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }

                .widget-close-btn:hover {
                    opacity: 1;
                }

                .widget-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: #1a1a1a;
                    position: relative;
                }

                .widget-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .widget-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .widget-messages::-webkit-scrollbar-track {
                    background: transparent;
                }

                .widget-messages::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                }

                .widget-message {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                }

                .widget-message.user {
                    flex-direction: row-reverse;
                }

                .widget-message-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .widget-message-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-width: 75%;
                }

                .widget-message-bubble {
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .widget-message-bubble.assistant {
                    background: white;
                    color: #1a1a1a;
                    border-radius: 12px 12px 12px 4px;
                }

                .widget-message-bubble.user {
                    color: white;
                    border-radius: 12px 12px 4px 12px;
                }

                .widget-sections {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 4px;
                }

                .widget-section-chip {
                    padding: 6px 12px;
                    border-radius: 16px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .widget-section-chip:hover {
                    background: rgba(255,255,255,0.2);
                }

                .widget-section-chip.active {
                    color: white;
                }

                .widget-typing {
                    display: flex;
                    gap: 4px;
                    padding: 12px 16px;
                    background: white;
                    border-radius: 12px 12px 12px 4px;
                }

                .widget-typing span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #999;
                    animation: typing 1.4s infinite;
                }

                .widget-typing span:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .widget-typing span:nth-child(3) {
                    animation-delay: 0.4s;
                }

                .widget-input-container {
                    padding: 16px;
                    background: #0a0a0a;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .widget-input-section-badge {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255,255,255,0.1);
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    color: #a1a1aa;
                }
                
                .widget-input-section-badge button {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }
                
                .widget-input-section-badge button:hover {
                    color: white;
                }

                .widget-input-wrapper {
                     display: flex;
                     gap: 8px;
                }

                .widget-input {
                    flex: 1;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 10px 12px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                }

                .widget-input::placeholder {
                    color: rgba(255,255,255,0.5);
                }

                .widget-send-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.2s;
                    background: transparent;
                }

                .widget-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .widget-send-btn:hover {
                    background: rgba(255,255,255,0.1);
                }

                /* Tab Bar */
                .widget-tab-bar {
                    display: flex;
                    justify-content: space-around;
                    padding: 12px;
                    background: #0a0a0a;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }

                .widget-tab-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    background: none;
                    border: none;
                    color: #71717a;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .widget-tab-btn:hover {
                    color: #a1a1aa;
                }

                .widget-tab-btn.active {
                    color: white;
                }
                
                .widget-tab-btn span {
                    font-size: 10px;
                    font-weight: 500;
                }

                .widget-footer {
                    padding: 8px 10px 12px;
                    text-align: center;
                    font-size: 10px;
                    color: rgba(255,255,255,0.3);
                    background: #0a0a0a;
                }

                @media (max-width: 480px) {
                    .widget-chat-window {
                        width: calc(100vw - 40px);
                        height: calc(100vh - 40px);
                    }
                }
            `}</style>
        </div>
    );
};

export default ChatWidget;
