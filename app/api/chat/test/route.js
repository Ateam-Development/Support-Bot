import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getChatbotById, getSectionsByChatbotId, getKnowledgeByChatbotId } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

/**
 * POST /api/chat/test
 * Test chat endpoint for playground
 */
export async function POST(request) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId, message, sectionId } = await request.json();

        if (!chatbotId || !message) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Chatbot ID and message are required' },
                { status: 400 }
            );
        }

        // Get chatbot configuration
        const chatbot = await getChatbotById(chatbotId);
        if (!chatbot || chatbot.userId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Get knowledge base
        let knowledgeItems = await getKnowledgeByChatbotId(chatbotId);

        // Filter by section if active
        let contextMessage = '';
        if (sectionId) {
            const sections = await getSectionsByChatbotId(chatbotId);
            const activeSection = sections.find(s => s.id === sectionId);

            if (activeSection && activeSection.sources && activeSection.sources.length > 0) {
                // Filter knowledge to only include sources from this section
                knowledgeItems = knowledgeItems.filter(k =>
                    activeSection.sources.includes(k.id)
                );
                contextMessage = `Focus on answering questions about ${activeSection.name}. ${activeSection.description || ''}`;
            }
        }

        // Build context from knowledge base
        const knowledgeContext = knowledgeItems
            .map(k => {
                if (k.type === 'text') {
                    return k.content;
                } else if (k.type === 'website') {
                    return k.metadata?.extractedText || '';
                } else if (k.type === 'file') {
                    return k.metadata?.extractedText || '';
                }
                return '';
            })
            .filter(Boolean)
            .join('\n\n');

        // Determine which API to use
        const useOpenAI = chatbot.openaiApiKey && chatbot.openaiApiKey.trim() !== '';
        const useGemini = chatbot.geminiApiKey && chatbot.geminiApiKey.trim() !== '';

        let response;

        if (useOpenAI) {
            response = await callOpenAI(
                chatbot.openaiApiKey,
                chatbot.systemMessage || 'You are a helpful assistant.',
                knowledgeContext,
                contextMessage,
                message
            );
        } else if (useGemini) {
            response = await callGemini(
                chatbot.geminiApiKey,
                chatbot.systemMessage || 'You are a helpful assistant.',
                knowledgeContext,
                contextMessage,
                message
            );
        } else {
            // No API key configured
            return NextResponse.json({
                success: true,
                data: {
                    message: 'Please configure an API key (OpenAI or Gemini) in the settings to enable chat functionality.',
                    isError: true
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                message: response,
                isError: false
            }
        });

    } catch (error) {
        console.error('Test chat error:', error);
        return handleApiError(error, 'processing chat message');
    }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey, systemMessage, knowledgeContext, contextMessage, userMessage) {
    const messages = [
        {
            role: 'system',
            content: systemMessage
        }
    ];

    if (knowledgeContext) {
        messages.push({
            role: 'system',
            content: `Knowledge Base:\n${knowledgeContext}`
        });
    }

    if (contextMessage) {
        messages.push({
            role: 'system',
            content: contextMessage
        });
    }

    messages.push({
        role: 'user',
        content: userMessage
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Call Gemini API
 */
async function callGemini(apiKey, systemMessage, knowledgeContext, contextMessage, userMessage) {
    let prompt = `${systemMessage}\n\n`;

    if (knowledgeContext) {
        prompt += `Knowledge Base:\n${knowledgeContext}\n\n`;
    }

    if (contextMessage) {
        prompt += `${contextMessage}\n\n`;
    }

    prompt += `User: ${userMessage}\n\nAssistant:`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
