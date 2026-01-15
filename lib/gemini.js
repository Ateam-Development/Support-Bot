/**
 * Google Gemini API Integration
 * Used for content summarization
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Check if Gemini API key is configured
 */
function isGeminiConfigured() {
    return !!GEMINI_API_KEY;
}

/**
 * Helper function to retry an operation with exponential backoff
 * @param {Function} operation - The async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retryWithBackoff(operation, maxRetries = 5, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            // Check if error is retryable (503 Service Unavailable or 429 Too Many Requests)
            if (error.message.includes('503') || error.message.includes('429')) {
                const delay = baseDelay * Math.pow(2, i);
                console.warn(`Gemini API busy/overloaded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // If it's not a retryable error, throw immediately
                throw error;
            }
        }
    }
    throw lastError;
}

/**
 * Summarize content using Gemini API
 * @param {string} content - The content to summarize
 * @param {string} type - The type of content ('website', 'file', 'text')
 * @returns {Promise<string>} - The summary
 */
async function summarizeContent(content, type = 'text') {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.');
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Using gemini-2.5-flash as requested by user
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let prompt = '';

        switch (type) {
            case 'website':
                prompt = `Summarize the following website content in a concise paragraph (3-5 sentences). Focus on the main topics and key information:\n\n${content}`;
                break;
            case 'file':
                prompt = `Summarize the following document content in a concise paragraph (3-5 sentences). Highlight the main points and important information:\n\n${content}`;
                break;
            case 'text':
                prompt = `Summarize the following text in a concise paragraph (3-5 sentences):\n\n${content}`;
                break;
            default:
                prompt = `Summarize the following content:\n\n${content}`;
        }

        return await retryWithBackoff(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const summary = response.text();
            return summary.trim();
        });

    } catch (error) {
        console.error('Gemini summarization error:', error);
        throw new Error(`Failed to summarize content: ${error.message}`);
    }
}

/**
 * Generate a title from content using Gemini API
 * @param {string} content - The content to generate a title from
 * @returns {Promise<string>} - The generated title
 */
async function generateTitle(content) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured.');
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Generate a short, descriptive title (maximum 8 words) for the following content:\n\n${content.substring(0, 500)}`;

        return await retryWithBackoff(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const title = response.text();
            return title.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
        });

    } catch (error) {
        console.error('Gemini title generation error:', error);
        return 'Untitled';
    }
}

module.exports = {
    isGeminiConfigured,
    summarizeContent,
    generateTitle
};

