/**
 * Google Gemini API Integration
 * Content summarization, formatting, and Chat AI completion engine
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Check if Gemini API key is configured
 */
function isGeminiConfigured() {
    return !!process.env.GEMINI_API_KEY;
}

/**
 * Helper function to retry an operation with exponential backoff
 */
async function retryWithBackoff(operation, maxRetries = 5, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (error.message && (error.message.includes('503') || error.message.includes('429') || error.message.includes('overloaded'))) {
                const delay = baseDelay * Math.pow(2, i);
                console.warn(`Gemini API busy. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw lastError;
}

/**
 * Clean up, format, and structure raw content for Knowledge Base ingestion
 * Preserves all factual details, pricing, policies while stripping web boilerplate.
 * @param {string} content
 * @param {string} type - 'website' | 'file' | 'text'
 * @param {string} customKey
 * @returns {Promise<string>}
 */
async function summarizeContentForChatbot(content, type = 'text', customKey = null) {
    const key = typeof customKey === 'string' 
        ? customKey 
        : (customKey?.geminiApiKey || process.env.GEMINI_API_KEY);
        
    if (!key) {
        return content;
    }

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Clean up, format, and structure the following scraped website content or document.
Remove all raw HTML, JavaScript, CSS code blocks, navigation menus, header/footer boilerplate, and website junk.
IMPORTANT: Do NOT cut, drop, summarize away, or omit any actual information, details, policies, prices, email addresses, phone numbers, terms, or services. Keep all real content completely intact.
Format cleanly using structured paragraphs, clear section headers, and bullet points:\n\n${content}`;

        return await retryWithBackoff(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        });
    } catch (error) {
        console.error('Error formatting content with Gemini:', error);
        return content; // Fallback to raw content if formatting fails
    }
}

/**
 * Generate a concise title for content
 */
async function generateTitle(content, customKey = null) {
    const key = customKey || process.env.GEMINI_API_KEY;
    if (!key) return 'Untitled Document';

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Generate a short, descriptive title (maximum 8 words) for the following content:\n\n${content.substring(0, 500)}`;

        return await retryWithBackoff(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim().replace(/^["']|["']$/g, '');
        });
    } catch (error) {
        console.error('Gemini title generation error:', error);
        return 'Untitled Document';
    }
}

/**
 * Generate Chat completion using Gemini API with RAG Context, System Prompt, and Tone Guardrails
 */
async function generateChatCompletion({
    systemMessage = 'You are a helpful assistant.',
    history = [],
    userMessage = '',
    contextChunks = [],
    sectionTone = 'Neutral',
    sectionScope = null,
    customApiKey = null
}) {
    const key = customApiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY is not configured.');
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build Tone Instructions
    let toneInstruction = '';
    switch (sectionTone) {
        case 'Strict':
            toneInstruction = 'TONE: Strict. Provide fact-based, direct answers relying ONLY on the provided knowledge context. Do not engage in casual small talk or guess facts.';
            break;
        case 'Friendly':
            toneInstruction = 'TONE: Friendly. Be warm, enthusiastic, conversational, and helpful.';
            break;
        case 'Empathetic':
            toneInstruction = 'TONE: Empathetic. Be supportive, understanding, patient, and calming.';
            break;
        case 'Neutral':
        default:
            toneInstruction = 'TONE: Neutral. Be professional, concise, direct, and helpful.';
            break;
    }

    // Build Scope Guardrails Instructions
    let scopeInstruction = '';
    if (sectionScope) {
        const allowed = sectionScope.allowed || [];
        const blocked = sectionScope.blocked || [];

        if (allowed.length > 0) {
            scopeInstruction += `\nALLOWED TOPICS (ONLY discuss these topics): ${allowed.join(', ')}. Politely decline to answer questions outside these topics.`;
        }
        if (blocked.length > 0) {
            scopeInstruction += `\nBLOCKED TOPICS (STRICTLY FORBIDDEN): ${blocked.join(', ')}. Politely decline to answer questions about these topics.`;
        }
    }

    // Format Knowledge Base Context
    let contextText = '';
    if (contextChunks && contextChunks.length > 0) {
        contextText = `\n\n--- KNOWLEDGE BASE CONTEXT ---\n` +
            contextChunks.map((chunk, idx) => `[Source ${idx + 1}]: ${chunk.content}`).join('\n\n') +
            `\n-------------------------------\n`;
    }

    // Assemble Full System Instruction Prompt
    const fullSystemPrompt = `${systemMessage}
${toneInstruction}${scopeInstruction}
Instructions: Use the provided Knowledge Base Context to answer the user's questions accurately. If the context does not contain enough information, state politely that you don't have that specific information.`;

    // Prepare chat history messages
    const contents = [];

    // System prompt as initial turn instruction
    contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTION]\n${fullSystemPrompt}\n${contextText}` }]
    });
    contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will answer based on your instructions and knowledge base context.' }]
    });

    // Recent conversation history (up to last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
        const role = (msg.role === 'user') ? 'user' : 'model';
        const text = msg.text || msg.content || '';
        if (text) {
            contents.push({
                role,
                parts: [{ text }]
            });
        }
    }

    // Current User Message
    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    return await retryWithBackoff(async () => {
        const result = await model.generateContent({ contents });
        const response = await result.response;
        return response.text().trim();
    });
}

module.exports = {
    isGeminiConfigured,
    summarizeContentForChatbot,
    generateTitle,
    generateChatCompletion
};
