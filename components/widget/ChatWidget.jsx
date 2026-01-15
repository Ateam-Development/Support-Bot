"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Home, MessageSquare, Headset } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToMessages } from '@/lib/firebase-realtime';
import './widget.css';

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

    // Mobile Detection
    const [isMobile, setIsMobile] = useState(false);

    // Color mapping
    const colorMap = {
        blue: '#2563eb',
        purple: '#9333ea',
        green: '#16a34a',
        orange: '#ea580c',
        red: '#dc2626',
    };

    const themeColors = {
        black: {
            '--w-bg': 'rgba(26, 26, 26, 0.95)',
            '--w-bg-sec': 'rgba(10, 10, 10, 0.6)',
            '--w-text': '#ffffff',
            '--w-text-sec': 'rgba(255,255,255,0.6)',
            '--w-border': 'rgba(255,255,255,0.08)',
            '--w-input-bg': 'rgba(255,255,255,0.08)',
            '--w-msg-ast-bg': 'rgba(255,255,255,0.95)',
            '--w-msg-ast-txt': '#1a1a1a',
            '--w-hover': 'rgba(255,255,255,0.1)',
            '--w-scroll': 'rgba(255,255,255,0.15)',
            '--w-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        },
        white: {
            '--w-bg': '#ffffff', // Pure white, no transparency to avoid silver look
            '--w-bg-sec': '#fafafa', // Very light gray for sections/footer
            '--w-text': '#18181b',
            '--w-text-sec': '#71717a',
            '--w-border': '#e4e4e7', // Cleaner border
            '--w-input-bg': '#f4f4f5',
            '--w-msg-ast-bg': '#f4f4f5',
            '--w-msg-ast-txt': '#18181b',
            '--w-hover': '#f4f4f5',
            '--w-scroll': '#d4d4d8',
            '--w-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' // Softer shadow
        }
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

        // Check mobile
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
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

    // Initialize Live Chat Welcome Message
    useEffect(() => {
        if (config && liveMessages.length === 0 && !liveConversationId) {
            setLiveMessages([
                {
                    id: 'live-initial-welcome',
                    role: 'assistant',
                    content: "Hello! How can we help you today?",
                    type: 'live'
                }
            ]);
        }
    }, [config, liveConversationId]);

    // Real-time listener for live chat messages
    useEffect(() => {
        if (!liveConversationId) return;
        const unsubscribe = subscribeToMessages(liveConversationId, (messages) => {
            const liveOnly = messages.filter(msg => msg.type === 'live');
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

    // Notify parent window about resize needs
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (isOpen) {
                // Open immediately
                window.parent.postMessage({
                    type: 'oneminute-widget-resize',
                    isOpen: true
                }, '*');
            } else {
                // Delay close to allow exit animation to finish
                // Increased delay to 400ms to allow 300ms animation to complete fully without flicker
                const timer = setTimeout(() => {
                    window.parent.postMessage({
                        type: 'oneminute-widget-resize',
                        isOpen: false
                    }, '*');
                }, 400);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen]);

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
                    visitorId: visitorId
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
                if (!liveConversationId) {
                    setLiveConversationId(data.data.conversationId);
                }
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
    const currentTheme = config ? themeColors[(config.theme || 'black').toLowerCase()] || themeColors.black : themeColors.black;

    // Animation Variants
    const desktopVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 20 }
    };

    const mobileVariants = {
        hidden: { opacity: 0, y: '100%' },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: '100%' }
    };

    if (!config) return null;

    return (
        <div className="widget-container" style={currentTheme}>
            <AnimatePresence mode="wait">
                {!isOpen && (
                    <motion.button
                        key="chat-button"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="widget-button"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="widget-button-content">
                            <MessageCircle size={32} color="white" strokeWidth={2.5} />
                            {/* Notification Dot */}
                            <span className="widget-notification-dot"></span>
                        </div>
                    </motion.button>
                )}

                {isOpen && (
                    <motion.div
                        key="chat-window"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={isMobile ? mobileVariants : desktopVariants}
                        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                        className="widget-chat-window"
                    >
                        {/* Header */}
                        <div className="widget-header">
                            <div className="widget-header-content">
                                <div className="widget-avatar-small">
                                    {activeTab === 'home' ? <MessageCircle size={22} color="white" strokeWidth={2} /> : <Headset size={22} color="white" strokeWidth={2} />}
                                </div>
                                <div className="widget-header-text">
                                    <div className="widget-header-title">{activeTab === 'home' ? config.name : 'Live Support'}</div>
                                    <div className="widget-header-status">
                                        <span className="status-dot-small" style={{ backgroundColor: '#10b981' }}></span>
                                        Online
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="widget-close-btn">
                                <X size={20} />
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
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
                                >
                                    <div className="widget-messages">
                                        {aiMessages.map((msg) => (
                                            <div key={msg.id} className={`widget-message ${msg.role}`}>
                                                {msg.role === 'assistant' && (
                                                    <div className="widget-message-avatar" style={{ backgroundColor: primaryColor }}>
                                                        <MessageCircle size={15} color="white" />
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
                                                    <MessageCircle size={15} color="white" />
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
                                                <button onClick={() => setActiveSection(null)}><X size={12} /></button>
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
                                            >
                                                <Send size={18} color={aiInput.trim() ? "white" : "rgba(255,255,255,0.4)"} />
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
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
                                >
                                    <div className="widget-messages">
                                        {liveMessages.map((msg) => (
                                            <div key={msg.id} className={`widget-message ${msg.role}`}>
                                                {msg.role === 'assistant' && (
                                                    <div className="widget-message-avatar" style={{ backgroundColor: '#10b981' }}> {/* Green for live agent */}
                                                        <Headset size={15} color="white" />
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
                                                    <Headset size={15} color="white" />
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
                                            >
                                                <Send size={18} color={liveInput.trim() ? "white" : "rgba(255,255,255,0.4)"} />
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
        </div>
    );
};

export default ChatWidget;
