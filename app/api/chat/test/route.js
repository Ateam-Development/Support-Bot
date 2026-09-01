import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getChatbotById, getSectionById } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';
import { retrieveContext } from '@/lib/rag';
import { generateMultiProviderCompletion } from '@/lib/llm';

/**
 * POST /api/chat/test
 * Test chat endpoint for playground with full RAG and Multi-Provider LLM support
 */
export async function POST(request) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId, message, sectionId, history = [] } = await request.json();

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

        // Section Tone & Scope Filtering
        let allowedKnowledgeIds = null;
        let sectionTone = 'Neutral';
        let sectionScope = null;

        if (sectionId) {
            const section = await getSectionById(sectionId);
            if (section) {
                sectionTone = section.tone || 'Neutral';
                sectionScope = {
                    ...(typeof section.scope === 'object' && section.scope ? section.scope : {}),
                    sectionName: section.name,
                    description: section.description || (typeof section.scope === 'string' ? section.scope : '')
                };
                allowedKnowledgeIds = (section.sources && section.sources.length > 0) ? section.sources : null;
            }
        }

        // Retrieve Context Chunks via RAG Engine
        let contextChunks = [];
        try {
            contextChunks = await retrieveContext(chatbotId, message, {
                allowedKnowledgeIds,
                topK: 5,
                provider: chatbot.provider || chatbot.model || 'gemini'
            });
        } catch (ragErr) {
            console.error('[RAG-TEST-CHAT] Error retrieving context:', ragErr);
        }

        // Generate completion using unified multi-provider engine
        let response;
        try {
            response = await generateMultiProviderCompletion({
                chatbot,
                provider: chatbot.provider || chatbot.model,
                model: chatbot.modelName,
                systemMessage: chatbot.systemMessage || 'You are a helpful assistant.',
                history,
                userMessage: message,
                contextChunks,
                sectionTone,
                sectionScope
            });
        } catch (aiError) {
            console.error('[AI-TEST-CHAT] Error generating AI response:', aiError);
            return NextResponse.json({
                success: true,
                data: {
                    message: `Error from ${chatbot.model || 'AI'}: ${aiError.message || 'Please check your API key configuration.'}`,
                    isError: true
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                message: response,
                isError: false,
                contextChunksCount: contextChunks.length
            }
        });

    } catch (error) {
        console.error('Test chat error:', error);
        return handleApiError(error, 'processing chat message');
    }
}
