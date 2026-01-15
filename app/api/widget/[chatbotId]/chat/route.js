import { NextResponse } from 'next/server';
import { getChatbotById, getSectionsByChatbotId, getKnowledgeByChatbotId, createConversation, addMessageToConversation, getConversationById, getConversationByVisitorId } from '@/lib/db';
import { addRealtimeMessage } from '@/lib/firebase-realtime';

/**
 * POST /api/widget/:chatbotId/chat
 * Public chat endpoint for widget
 * No authentication required
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, sectionId, conversationId, visitorId } = await request.json();

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Message is required' },
                { status: 400 }
            );
        }

        // Get chatbot configuration
        const chatbot = await getChatbotById(chatbotId);

        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await getConversationById(conversationId);
            if (!conversation || conversation.chatbotId !== chatbotId) {
                // Invalid conversation ID, try finding by visitorId if available
                if (visitorId) {
                    conversation = await getConversationByVisitorId(chatbotId, visitorId);
                }

                // If still no conversation, create new one
                if (!conversation) {
                    conversation = await createConversation(chatbotId, null, visitorId);
                }
            }
        } else {
            // No ID provided, try finding existing active conversation by visitorId
            if (visitorId) {
                conversation = await getConversationByVisitorId(chatbotId, visitorId);
            }

            // Create new if none found
            if (!conversation) {
                conversation = await createConversation(chatbotId, null, visitorId);
            }
        }

        // Add user message to conversation
        const userMessage = {
            role: 'user',
            content: message,
            type: 'ai', // This is part of AI conversation
            timestamp: new Date().toISOString()
        };
        await addMessageToConversation(conversation.id, userMessage);

        // Sync to Realtime DB
        try {
            await addRealtimeMessage(conversation.id, userMessage);
        } catch (e) {
            console.error('Realtime DB sync failed:', e);
        }

        // Get knowledge base
        let knowledgeItems = await getKnowledgeByChatbotId(chatbotId);

        // Filter by section if active
        let contextMessage = '';
        if (sectionId) {
            const sections = await getSectionsByChatbotId(chatbotId);
            const activeSection = sections.find(s => s.id === sectionId);

            if (activeSection && activeSection.sources && activeSection.sources.length > 0) {
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

        let aiResponse;

        if (useOpenAI) {
            aiResponse = await callOpenAI(
                chatbot.openaiApiKey,
                chatbot.systemMessage || 'You are a helpful assistant.',
                knowledgeContext,
                contextMessage,
                message
            );
        } else if (useGemini) {
            aiResponse = await callGemini(
                chatbot.geminiApiKey,
                chatbot.systemMessage || 'You are a helpful assistant.',
                knowledgeContext,
                contextMessage,
                message
            );
        } else {
            aiResponse = 'Please configure an API key (OpenAI or Gemini) to enable chat functionality.';
        }

        // Add AI message to conversation
        const aiMessage = {
            role: 'assistant',
            content: aiResponse,
            type: 'ai',
            timestamp: new Date().toISOString()
        };
        await addMessageToConversation(conversation.id, aiMessage);

        // Sync to Realtime DB
        try {
            await addRealtimeMessage(conversation.id, aiMessage);
        } catch (e) {
            console.error('Realtime DB sync failed:', e);
        }

        return NextResponse.json({
            success: true,
            data: {
                message: aiResponse,
                conversationId: conversation.id
            }
        });

    } catch (error) {
        console.error('Widget chat error:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError', message: 'Failed to process message' },
            { status: 500 }
        );
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
