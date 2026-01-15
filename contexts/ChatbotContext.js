'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { chatbotAPI } from '../lib/api';
import { useAuth } from './AuthContext';

const ChatbotContext = createContext();

export function ChatbotProvider({ children }) {
    const [chatbots, setChatbots] = useState([]);
    const [selectedChatbot, setSelectedChatbot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { user, loading: authLoading } = useAuth();

    // Load chatbots on mount (when authenticated)
    useEffect(() => {
        if (!authLoading && user) {
            loadChatbots();
        } else if (!authLoading && !user) {
            setChatbots([]);
            setLoading(false);
        }
    }, [user, authLoading]);

    // Load all chatbots
    const loadChatbots = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = await user.getIdToken();
            const response = await chatbotAPI.list(token);

            if (response.success && response.data) {
                setChatbots(response.data);

                // Select first chatbot if none selected
                if (!selectedChatbot && response.data.length > 0) {
                    setSelectedChatbot(response.data[0]);
                }
            }
        } catch (err) {
            console.error('Error loading chatbots:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create new chatbot
    const createChatbot = async (chatbotData) => {
        try {
            const token = await user.getIdToken();
            const response = await chatbotAPI.create(chatbotData, token);

            if (response.success && response.data) {
                const newChatbot = response.data;
                setChatbots(prev => [newChatbot, ...prev]);
                setSelectedChatbot(newChatbot);
                return newChatbot;
            }
        } catch (err) {
            console.error('Error creating chatbot:', err);
            throw err;
        }
    };

    // Update chatbot
    const updateChatbot = async (chatbotId, updates) => {
        try {
            const token = await user.getIdToken();
            const response = await chatbotAPI.update(chatbotId, updates, token);

            if (response.success && response.data) {
                const updatedChatbot = response.data;

                setChatbots(prev =>
                    prev.map(bot => bot.id === chatbotId ? updatedChatbot : bot)
                );

                if (selectedChatbot?.id === chatbotId) {
                    setSelectedChatbot(updatedChatbot);
                }

                return updatedChatbot;
            }
        } catch (err) {
            console.error('Error updating chatbot:', err);
            throw err;
        }
    };

    // Delete chatbot
    const deleteChatbot = async (chatbotId) => {
        try {
            const token = await user.getIdToken();
            await chatbotAPI.delete(chatbotId, token);

            setChatbots(prev => prev.filter(bot => bot.id !== chatbotId));

            if (selectedChatbot?.id === chatbotId) {
                const remaining = chatbots.filter(bot => bot.id !== chatbotId);
                setSelectedChatbot(remaining.length > 0 ? remaining[0] : null);
            }
        } catch (err) {
            console.error('Error deleting chatbot:', err);
            throw err;
        }
    };

    // Select chatbot
    const selectChatbot = (chatbot) => {
        setSelectedChatbot(chatbot);
    };

    const value = {
        chatbots,
        selectedChatbot,
        loading,
        error,
        loadChatbots,
        createChatbot,
        updateChatbot,
        deleteChatbot,
        selectChatbot
    };

    return (
        <ChatbotContext.Provider value={value}>
            {children}
        </ChatbotContext.Provider>
    );
}

export function useChatbot() {
    const context = useContext(ChatbotContext);

    if (!context) {
        throw new Error('useChatbot must be used within a ChatbotProvider');
    }

    return context;
}
