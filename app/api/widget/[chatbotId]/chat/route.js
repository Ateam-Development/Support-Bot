import { NextResponse } from 'next/server';
import {
    getChatbotById,
    getSectionsByChatbotId,
    getKnowledgeByChatbotId,
    createConversation,
    addMessageToConversation,
    getConversationById,
    getConversationByVisitorId,
    getFlow,
    updateConversation
} from '@/lib/db';
import { addRealtimeMessage } from '@/lib/firebase-realtime';
import { FlowEngine } from '@/lib/flow-engine';
import { admin } from '@/lib/firebase-admin'; // Added this import based on the provided edit

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

/**
 * POST /api/widget/:chatbotId/chat
 * Public chat endpoint for widget
 * No authentication required
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, sectionId, conversationId, visitorId, trigger } = await request.json();

        if (!message && trigger !== 'init_flow') {
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

        // Add user message to conversation ONLY if message exists
        if (message) {
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
        }

        // =================================================================================
        // FLOW ENGINE LOGIC
        // =================================================================================

        // Check for active flow
        const flowData = await getFlow(chatbotId);
        console.log(`Chat Route: Flow data loaded. Enabled: ${flowData?.enabled}, StartNodeId: ${flowData?.startNodeId}, NodeCount: ${Object.keys(flowData?.nodes || {}).length}`);
        console.log(`Chat Route: Node IDs in DB: ${Object.keys(flowData?.nodes || {}).join(', ')}`);
        let flowResponse = null;

        // If flow is enabled (or exists), and we are either IN a flow or STARTING a flow
        // For now, always check if there is a flow.
        if (flowData && flowData.enabled !== false) {
            // Check if conversation already has flow state
            const currentFlowState = conversation.flowState || null;

            // Should we start a flow? 
            // - If no flow state, and this is the FIRST message? Or explicit trigger?
            // - For simplicity: If there is a defined flow, we try to use it unless completed.

            // Logic: Is there an active flow state?
            let shouldProcessFlow = false;

            console.log(`Chat Route: Checking Flow Trigger. State: ${!!currentFlowState}, MsgCount: ${conversation.messages?.length}, Trigger: ${trigger}`);

            if (trigger === 'init_flow') {
                // FORCE START (Reset flow)
                shouldProcessFlow = true;
            } else if (currentFlowState && !currentFlowState.isComplete) {
                // Determine if we should continue the flow
                shouldProcessFlow = true;
            } else if (!currentFlowState && (!conversation.messages || conversation.messages.length <= 1)) {
                // Start flow on first message
                shouldProcessFlow = true;
            }

            console.log(`Chat Route: shouldProcessFlow = ${shouldProcessFlow}`);

            if (shouldProcessFlow) {
                const engine = new FlowEngine(flowData);

                // If this is the start, we might not want to process user input as an ANSWER yet,
                // but rather as a trigger.
                // However, the standard layout is: Bot Says X -> User Says Y -> Bot Validates Y.
                // If we have no state, we are at Start.
                // If user just sent "Hi", we might want to Ignore that input for the flow Logic context, 
                // OR treat "Hi" as the answer to... nothing?
                // Let's assume:
                // If no state: Input is ignored/consumed, and we return StartNode text.
                // If state exists: Input is processed against Current Node.

                let result;

                if (!currentFlowState || trigger === 'init_flow') {
                    // INITIALIZE FLOW SEQUENCE
                    console.log(`Flow Init: Chatbot ${chatbotId}, Flow Enabled: ${flowData.enabled}`);
                    console.log(`Flow Data Keys: startNodeId=${flowData.startNodeId}, NodeCount=${Object.keys(flowData.nodes || {}).length}`);

                    const sequence = engine.getStartSequence();
                    console.log("Flow Init Sequence Result:", sequence ? `Found ${sequence.messages.length} msgs` : "NULL");

                    if (sequence && sequence.messages.length > 0) {

                        // Accumulate messages
                        flowResponse = sequence.messages; // Array [{text, options}]

                        await updateConversation(conversation.id, {
                            flowState: {
                                currentStepId: sequence.currentStepId,
                                isComplete: sequence.isComplete,
                                data: {}
                            }
                        });
                    } else {
                        console.error("Flow Init Failed: Sequence is null or empty.");
                    }
                } else {
                    // CONTINUE FLOW
                    result = engine.processMessage(currentFlowState, message);

                    if (result.messages && result.messages.length > 0) {
                        flowResponse = result.messages; // Array

                        // Update State
                        const newData = { ...currentFlowState.data, ...result.capturedData };

                        console.log("Chat Route: Processing Step Result.");
                        console.log("Chat Route: Captured Data from Engine:", JSON.stringify(result.capturedData));
                        console.log("Chat Route: Merged Data to Save:", JSON.stringify(newData));

                        await updateConversation(conversation.id, {
                            flowState: {
                                currentStepId: result.nextStepId,
                                isComplete: result.isComplete,
                                data: newData
                            },
                            // Always update persisted data to ensure we don't lose emails if flow drops
                            capturedData: newData
                        });

                        // Set response flag specifically from this result
                        conversation.flowState = { isComplete: result.isComplete };

                        if (result.isComplete) {
                            await updateConversation(conversation.id, {
                                capturedData: newData
                            });

                            // Inject transition message if last message didn't already say it
                            if (!flowResponse) flowResponse = [];
                            const lastMsg = flowResponse[flowResponse.length - 1];
                            const transitionText = "What you want to ask next?";

                            if (!lastMsg || !lastMsg.text.includes(transitionText)) {
                                flowResponse.push({
                                    text: transitionText,
                                    options: [],
                                    type: 'text'
                                });
                            }
                        }
                    } else if (result.error) {
                        console.error("Flow error:", result.error);
                        // Return error as message so user sees something
                        flowResponse = [{ text: "Error: " + result.error, options: [] }];
                    } else {
                        // Success but no messages? (Maybe end of flow without text?)
                        // Do nothing, let it fall through? 
                        // Or say "Flow Complete".
                        // If isComplete is true and no message, maybe we are done.
                        if (result.isComplete && (!result.messages || result.messages.length === 0)) {
                            // Optional: flowResponse = [{ text: "Conversation ended.", options: [] }];
                        }
                    }
                }
            }
        }

        // If Flow produced a response (Array), return it.
        if (flowResponse) {
            let lastMsg = null;
            // Save all messages to DB
            for (const msg of flowResponse) {
                const flowMessage = {
                    role: 'assistant',
                    content: msg.text,
                    options: msg.options, // Save options to DB message
                    type: 'ai',
                    timestamp: new Date().toISOString()
                };
                await addMessageToConversation(conversation.id, flowMessage);
                try {
                    await addRealtimeMessage(conversation.id, flowMessage);
                } catch (e) {
                    console.error(e);
                }
                lastMsg = flowMessage;
            }

            return NextResponse.json({
                success: true,
                data: {
                    messages: flowResponse, // Return Array of objects {text, options}
                    conversationId: conversation.id,
                    isFlowComplete: conversation.flowState?.isComplete || false
                }
            });
        }

        // =================================================================================
        // END FLOW LOGIC
        // =================================================================================

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



        // STOP if this was an Init Trigger that failed to produce a Flow Response
        if (trigger === 'init_flow' && !flowResponse) {
            // DEBUG INFO
            const debugInfo = `StartID: ${flowData.startNodeId}, NodeCount: ${Object.keys(flowData.nodes || {}).length}, IDs: ${Object.keys(flowData.nodes || {}).slice(0, 3).join(',')}`;

            return NextResponse.json({
                success: true,
                data: {
                    message: `Flow Error: Start Node Not Found. (Debug: ${debugInfo})`,
                    conversationId: conversation.id
                }
            });
        }

        // Determine which API to use
        const useOpenAI = chatbot.openaiApiKey && chatbot.openaiApiKey.trim() !== '';
        const useGemini = chatbot.geminiApiKey && chatbot.geminiApiKey.trim() !== '';
        const useMistral = chatbot.mistralApiKey && chatbot.mistralApiKey.trim() !== '';

        let aiResponse;

        if (useOpenAI) {
            aiResponse = await callOpenAI(
                chatbot.openaiApiKey,
                chatbot.systemMessage || 'You are a helpful assistant.',
                knowledgeContext,
                contextMessage,
                message
            );
        } else if (useMistral) {
            aiResponse = await callMistral(
                chatbot.mistralApiKey,
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
            aiResponse = 'Please configure an API key (OpenAI, Gemini, or Mistral) to enable chat functionality.';
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

/**
 * Call Mistral API
 */
async function callMistral(apiKey, systemMessage, knowledgeContext, contextMessage, userMessage) {
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

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error?.message || error.message || JSON.stringify(error) || 'Unknown error';
        throw new Error(`Mistral API error: ${errorMessage}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
