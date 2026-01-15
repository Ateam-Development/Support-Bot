// API client for chatbot backend
import { auth } from './firebase-config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper function to get auth token from Firebase
async function getAuthToken() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.warn('API Client: No authenticated user found in auth.currentUser');
            return null;
        }
        console.log('API Client: Getting token for user:', user.email);
        const token = await user.getIdToken();
        console.log('API Client: Token retrieved successfully (length: ' + token.length + ')');
        return token;
    } catch (error) {
        console.error('API Client: Error getting auth token:', error);
        return null;
    }
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    let token = options.token;

    // If no token provided, try to get from global auth (fallback)
    if (!token) {
        token = await getAuthToken();
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }

    return data;
}

// Chatbot Management API
export const chatbotAPI = {
    // List all chatbots
    list: async (token) => {
        return apiCall('/api/chatbots', { token });
    },

    // Get specific chatbot
    get: async (chatbotId, token) => {
        return apiCall(`/api/chatbots/${chatbotId}`, { token });
    },

    // Create new chatbot
    create: async (chatbotData, token) => {
        return apiCall('/api/chatbots', {
            method: 'POST',
            body: JSON.stringify(chatbotData),
            token
        });
    },

    // Update chatbot
    update: async (chatbotId, updates, token) => {
        return apiCall(`/api/chatbots/${chatbotId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
            token
        });
    },

    // Delete chatbot
    delete: async (chatbotId, token) => {
        return apiCall(`/api/chatbots/${chatbotId}`, {
            method: 'DELETE',
            token
        });
    }
};

// Knowledge Base API
export const knowledgeAPI = {
    // List knowledge items
    list: async (chatbotId) => {
        return apiCall(`/api/knowledge/${chatbotId}`);
    },

    // Add website URL
    addWebsite: async (chatbotId, url) => {
        return apiCall(`/api/knowledge/${chatbotId}/website`, {
            method: 'POST',
            body: JSON.stringify({ url })
        });
    },

    // Add file
    addFile: async (chatbotId, fileData) => {
        return apiCall(`/api/knowledge/${chatbotId}/file`, {
            method: 'POST',
            body: JSON.stringify(fileData)
        });
    },

    // Add text
    addText: async (chatbotId, text, title) => {
        return apiCall(`/api/knowledge/${chatbotId}/text`, {
            method: 'POST',
            body: JSON.stringify({ text, title })
        });
    },

    // Delete knowledge item
    delete: async (chatbotId, knowledgeId) => {
        return apiCall(`/api/knowledge/${chatbotId}/${knowledgeId}`, {
            method: 'DELETE'
        });
    }
};

// Conversations API
export const conversationsAPI = {
    // List conversations for chatbot
    list: async (chatbotId, limit = 50) => {
        return apiCall(`/api/conversations/${chatbotId}?limit=${limit}`);
    },

    // Get specific conversation
    get: async (conversationId) => {
        return apiCall(`/api/conversations/detail/${conversationId}`);
    }
};

// Settings API
export const settingsAPI = {
    // Get settings
    get: async (chatbotId) => {
        return apiCall(`/api/settings/${chatbotId}`);
    },

    // Update settings
    update: async (chatbotId, settings) => {
        return apiCall(`/api/settings/${chatbotId}`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }
};

// Chat API
export const chatAPI = {
    // Send message
    sendMessage: async (chatbotId, message, conversationId = null) => {
        return apiCall(`/api/chat/${chatbotId}`, {
            method: 'POST',
            body: JSON.stringify({ message, conversationId })
        });
    }
};
