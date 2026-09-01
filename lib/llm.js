/**
 * Unified Multi-Provider LLM Completion Engine
 * Supports OpenAI (ChatGPT), Google Gemini, and Mistral AI
 * Seamlessly integrates RAG Context, System Instructions, Section Tones, and Scope Guardrails
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Exponential backoff helper for resilient API requests
 */
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const msg = error.message || '';
            if (msg.includes('503') || msg.includes('429') || msg.includes('overloaded') || msg.includes('rate limit')) {
                const delay = baseDelay * Math.pow(2, i);
                console.warn(`[LLM-RETRY] API rate-limited or busy. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw lastError;
}

/**
 * Format Tone, Scope, and Knowledge Context into a unified system prompt
 */
function buildSystemPrompt({ systemMessage = 'You are a helpful assistant.', sectionTone = 'Neutral', sectionScope = null, contextChunks = [] }) {
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

    let scopeInstruction = '';
    if (sectionScope) {
        if (typeof sectionScope === 'string') {
            scopeInstruction = `\nACTIVE TOPIC FOCUS: ${sectionScope}`;
        } else {
            if (sectionScope.sectionName) {
                scopeInstruction += `\nACTIVE TOPIC FOCUS: "${sectionScope.sectionName}". Prioritize providing detailed, accurate answers specifically relevant to the "${sectionScope.sectionName}" section/topic.`;
            }
            if (sectionScope.description) {
                scopeInstruction += `\nTOPIC GUIDELINE: ${sectionScope.description}`;
            }
            const allowed = sectionScope.allowed || [];
            const blocked = sectionScope.blocked || [];
            if (allowed.length > 0) {
                scopeInstruction += `\nALLOWED TOPICS (ONLY discuss these topics): ${allowed.join(', ')}. Politely decline to answer questions outside these topics.`;
            }
            if (blocked.length > 0) {
                scopeInstruction += `\nBLOCKED TOPICS (STRICTLY FORBIDDEN): ${blocked.join(', ')}. Politely decline to answer questions about these topics.`;
            }
        }
    }

    let contextText = '';
    if (contextChunks && contextChunks.length > 0) {
        contextText = `\n\n--- KNOWLEDGE BASE CONTEXT ---\n` +
            contextChunks.map((chunk, idx) => `[Source ${idx + 1}]: ${chunk.content}`).join('\n\n') +
            `\n-------------------------------\n`;
    }

    const formattingInstruction = "Please provide concise, well-structured answers with clear formatting (bullet points, short paragraphs) suitable for a web chat interface.";

    return `${systemMessage}
${toneInstruction}
${scopeInstruction}
${formattingInstruction}
${contextText}
Instructions: Use the provided Knowledge Base Context to answer the user's questions accurately. If the context does not contain enough information, state politely that you don't have that specific information.`;
}

/**
 * Call OpenAI API (ChatGPT)
 */
async function callOpenAI({ apiKey, model = 'gpt-4o-mini', systemPrompt, history = [], userMessage }) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY or configure it in chatbot settings.');
    }

    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
        const role = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
        const content = msg.content || msg.text || '';
        if (content) {
            messages.push({ role, content });
        }
    }

    messages.push({ role: 'user', content: userMessage });

    return await retryWithBackoff(async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
                messages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error (${response.status}): ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    });
}

/**
 * Call Google Gemini API
 */
async function callGemini({ apiKey, model = 'gemini-2.5-flash', systemPrompt, history = [], userMessage }) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY or configure it in chatbot settings.');
    }

    const genAI = new GoogleGenerativeAI(key);
    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-2.5-flash' });

    const contents = [];

    // System instruction turn
    contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }]
    });
    contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will answer strictly following your instructions and knowledge context.' }]
    });

    // Recent history
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
        const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
        const text = msg.text || msg.content || '';
        if (text) {
            contents.push({
                role,
                parts: [{ text }]
            });
        }
    }

    // User message
    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    return await retryWithBackoff(async () => {
        const result = await geminiModel.generateContent({ contents });
        const response = await result.response;
        return response.text().trim();
    });
}

/**
 * Call Mistral AI API
 */
async function callMistral({ apiKey, model = 'mistral-large-latest', systemPrompt, history = [], userMessage }) {
    const key = apiKey || process.env.MISTRAL_API_KEY;
    if (!key) {
        throw new Error('Mistral API key is not configured. Please add MISTRAL_API_KEY or configure it in chatbot settings.');
    }

    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
        const role = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
        const content = msg.content || msg.text || '';
        if (content) {
            messages.push({ role, content });
        }
    }

    messages.push({ role: 'user', content: userMessage });

    const mistralModel = model || 'mistral-small-latest';

    return await retryWithBackoff(async () => {
        let response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: mistralModel,
                messages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        // If 403 Forbidden (model tier limitation), fallback to mistral-small or open-mistral-7b
        if (response.status === 403 && mistralModel !== 'mistral-small-latest' && mistralModel !== 'open-mistral-7b') {
            console.warn(`[MISTRAL] Model ${mistralModel} returned 403 Forbidden. Falling back to mistral-small-latest...`);
            response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: 'mistral-small-latest',
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            const errMsg = error.error?.message || error.message || response.statusText;
            throw new Error(`Mistral API error (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    });
}

/**
 * Unified generation entrypoint
 * Automatically dispatches to ChatGPT / Gemini / Mistral based on chatbot configuration
 */
async function generateMultiProviderCompletion({
    chatbot = {},
    provider = null,
    model = null,
    systemMessage = 'You are a helpful assistant.',
    history = [],
    userMessage = '',
    contextChunks = [],
    sectionTone = 'Neutral',
    sectionScope = null,
    customApiKey = null
}) {
    // 1. Determine active provider
    let activeProvider = provider || chatbot.provider || chatbot.model || 'gemini';
    activeProvider = activeProvider.toLowerCase();

    // Map common model names to provider if needed
    if (activeProvider.startsWith('gpt') || activeProvider === 'openai' || activeProvider === 'chatgpt') {
        activeProvider = 'openai';
    } else if (activeProvider.startsWith('mistral')) {
        activeProvider = 'mistral';
    } else if (activeProvider.startsWith('gemini')) {
        activeProvider = 'gemini';
    }

    // 2. Select appropriate API key and model name
    let activeKey = customApiKey;
    let activeModel = model || chatbot.modelName;

    if (activeProvider === 'openai') {
        activeKey = activeKey || chatbot.openaiApiKey || process.env.OPENAI_API_KEY;
        activeModel = activeModel || 'gpt-4o-mini';
    } else if (activeProvider === 'mistral') {
        activeKey = activeKey || chatbot.mistralApiKey || process.env.MISTRAL_API_KEY;
        activeModel = activeModel || 'mistral-small-latest';
    } else {
        activeProvider = 'gemini';
        activeKey = activeKey || chatbot.geminiApiKey || process.env.GEMINI_API_KEY;
        activeModel = activeModel || 'gemini-2.5-flash';
    }

    // 3. Fallback check: if chosen provider has no key configured, check if any other provider is available
    if (!activeKey) {
        if (chatbot.geminiApiKey || process.env.GEMINI_API_KEY) {
            activeProvider = 'gemini';
            activeKey = chatbot.geminiApiKey || process.env.GEMINI_API_KEY;
            activeModel = chatbot.modelName || 'gemini-2.5-flash';
        } else if (chatbot.openaiApiKey || process.env.OPENAI_API_KEY) {
            activeProvider = 'openai';
            activeKey = chatbot.openaiApiKey || process.env.OPENAI_API_KEY;
            activeModel = chatbot.modelName || 'gpt-4o-mini';
        } else if (chatbot.mistralApiKey || process.env.MISTRAL_API_KEY) {
            activeProvider = 'mistral';
            activeKey = chatbot.mistralApiKey || process.env.MISTRAL_API_KEY;
            activeModel = chatbot.modelName || 'mistral-small-latest';
        } else {
            throw new Error('No AI provider API key is configured. Please provide a key for OpenAI, Gemini, or Mistral in chatbot settings or environment variables.');
        }
    }

    // 4. Build comprehensive prompt with RAG context and instructions
    const systemPrompt = buildSystemPrompt({
        systemMessage: chatbot.systemMessage || systemMessage,
        sectionTone,
        sectionScope,
        contextChunks
    });

    console.log(`[LLM-COMPLETION] Using provider=${activeProvider}, model=${activeModel}, contextChunks=${contextChunks.length}`);

    // 5. Execute request
    if (activeProvider === 'openai') {
        return await callOpenAI({
            apiKey: activeKey,
            model: activeModel,
            systemPrompt,
            history,
            userMessage
        });
    } else if (activeProvider === 'mistral') {
        return await callMistral({
            apiKey: activeKey,
            model: activeModel,
            systemPrompt,
            history,
            userMessage
        });
    } else {
        return await callGemini({
            apiKey: activeKey,
            model: activeModel,
            systemPrompt,
            history,
            userMessage
        });
    }
}

function isValidApiKey(key) {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    if (trimmed.length < 10) return false;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('your_') || lower.includes('placeholder') || lower === 'key...' || lower === 'sk-...' || lower === 'aiza...') {
        return false;
    }
    return true;
}

/**
 * Clean up, format, and structure raw content for Knowledge Base ingestion
 * Automatically uses the user's custom chatbot API key (Gemini, OpenAI, or Mistral) or global env keys
 * Guarantees a non-null string is always returned
 * @param {string} content - Raw text/markdown
 * @param {object} chatbot - Chatbot config object with custom api keys
 * @returns {Promise<string>}
 */
async function cleanAndFormatContent(content, chatbot = {}) {
    if (!content || typeof content !== 'string' || !content.trim()) {
        return content || '';
    }

    const prompt = `Clean up, format, and structure the following scraped website content or document.
Remove all raw HTML, JavaScript, CSS code blocks, navigation menus, header/footer boilerplate, and website junk.
IMPORTANT: Do NOT cut, drop, summarize away, or omit any actual information, details, policies, prices, email addresses, phone numbers, terms, or services. Keep all real content completely intact.
Format cleanly using structured paragraphs, clear section headers, and bullet points:\n\n${content}`;

    // 1. Try Gemini if user has valid custom geminiApiKey or GEMINI_API_KEY in env
    const rawGeminiKey = chatbot?.geminiApiKey || process.env.GEMINI_API_KEY;
    if (isValidApiKey(rawGeminiKey)) {
        const geminiKey = rawGeminiKey.trim();
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const resultText = await retryWithBackoff(async () => {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text()?.trim();
            });
            if (resultText && typeof resultText === 'string') {
                return resultText;
            }
        } catch (err) {
            console.warn('[LLM-FORMAT] Gemini formatting failed, trying next provider:', err.message);
        }
    }

    // 2. Try OpenAI if user has valid custom openaiApiKey or OPENAI_API_KEY in env
    const rawOpenAiKey = chatbot?.openaiApiKey || process.env.OPENAI_API_KEY;
    if (isValidApiKey(rawOpenAiKey)) {
        const openAiKey = rawOpenAiKey.trim();
        try {
            const resultText = await retryWithBackoff(async () => {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openAiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'You are an expert document cleaner and formatter.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.2,
                        max_tokens: 2500
                    })
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`OpenAI error (${response.status}): ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return data.choices?.[0]?.message?.content?.trim();
            });

            if (resultText && typeof resultText === 'string') {
                return resultText;
            }
        } catch (err) {
            console.warn('[LLM-FORMAT] OpenAI formatting failed:', err.message);
        }
    }

    // 3. Try Mistral if user has valid custom mistralApiKey or MISTRAL_API_KEY in env
    const rawMistralKey = chatbot?.mistralApiKey || process.env.MISTRAL_API_KEY;
    if (isValidApiKey(rawMistralKey)) {
        const mistralKey = rawMistralKey.trim();
        const mistralModel = chatbot?.modelName || 'mistral-small-latest';
        try {
            const resultText = await retryWithBackoff(async () => {
                let response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${mistralKey}`
                    },
                    body: JSON.stringify({
                        model: mistralModel,
                        messages: [
                            { role: 'system', content: 'You are an expert document cleaner and formatter.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.2,
                        max_tokens: 2500
                    })
                });

                // If 403 Forbidden (model tier restriction), fallback to mistral-small-latest or open-mistral-7b
                if (response.status === 403 && mistralModel !== 'mistral-small-latest') {
                    console.warn(`[LLM-FORMAT] Mistral model ${mistralModel} 403 Forbidden. Retrying with mistral-small-latest...`);
                    response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${mistralKey}`
                        },
                        body: JSON.stringify({
                            model: 'mistral-small-latest',
                            messages: [
                                { role: 'system', content: 'You are an expert document cleaner and formatter.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.2,
                            max_tokens: 2500
                        })
                    });
                }

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`Mistral error (${response.status}): ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return data.choices?.[0]?.message?.content?.trim();
            });

            if (resultText && typeof resultText === 'string') {
                return resultText;
            }
        } catch (err) {
            console.warn('[LLM-FORMAT] Mistral formatting failed:', err.message);
        }
    }

    console.log('[LLM-FORMAT] Using raw scraped content intact for preview/review.');
    return content || '';
}

module.exports = {
    generateMultiProviderCompletion,
    cleanAndFormatContent,
    callOpenAI,
    callGemini,
    callMistral,
    buildSystemPrompt
};
