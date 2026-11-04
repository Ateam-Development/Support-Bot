import { NextResponse, after } from 'next/server';
import {
    getChatbotById,
    getSectionsByChatbotId,
    createConversation,
    addMessageToConversation,
    addMessagesToConversation,
    getConversationById,
    getConversationByVisitorId,
    getFlow,
    updateConversation
} from '@/lib/db';
import { addRealtimeMessage } from '@/lib/firebase-realtime';
import { FlowEngine } from '@/lib/flow-engine';
import { retrieveContext } from '@/lib/rag';
import { generateMultiProviderCompletion } from '@/lib/llm';
import { upsertLead, captureLeadFromMessage } from '@/lib/leads';
import { getAvailableSlots, createBooking, sendBookingEmails, formatSlotLabel } from '@/lib/bookings';

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

async function resolveConversation(chatbotId, conversationId, visitorId) {
    if (conversationId) {
        const conversation = await getConversationById(conversationId);
        if (conversation && conversation.chatbotId === chatbotId) return conversation;
    }
    if (visitorId) {
        const conversation = await getConversationByVisitorId(chatbotId, visitorId);
        if (conversation) return conversation;
    }
    return createConversation(chatbotId, null, visitorId);
}

async function syncRealtime(conversationId, message) {
    try {
        await addRealtimeMessage(conversationId, message);
    } catch (e) {
        console.error('Realtime DB sync failed:', e);
    }
}

/** Attach live slot lists to booking messages so the widget can render the picker */
async function withSlots(chatbotId, messages) {
    return Promise.all(messages.map(async (msg) => {
        if (msg.type !== 'booking') return msg;
        try {
            return { ...msg, slots: await getAvailableSlots(chatbotId, msg.booking) };
        } catch (err) {
            console.error('[BOOKING] Failed to load slots:', err);
            return { ...msg, slots: [] };
        }
    }));
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

        // Independent lookups run in parallel to cut latency
        const [chatbot, flowData, conversation] = await Promise.all([
            getChatbotById(chatbotId),
            getFlow(chatbotId),
            resolveConversation(chatbotId, conversationId, visitorId)
        ]);

        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Add user message to conversation ONLY if message exists
        if (message) {
            const userMessage = {
                role: 'user',
                content: message,
                type: 'ai', // This is part of AI conversation
                timestamp: new Date().toISOString()
            };
            await Promise.all([
                addMessageToConversation(conversation.id, userMessage),
                syncRealtime(conversation.id, userMessage)
            ]);
        }

        // =================================================================================
        // FLOW ENGINE LOGIC
        // =================================================================================

        let flowResponse = null;
        let flowComplete = false;
        let flowHandledMessage = false;

        if (flowData && flowData.enabled !== false) {
            const currentFlowState = conversation.flowState || null;

            let shouldProcessFlow = false;
            if (trigger === 'init_flow') {
                // FORCE START (Reset flow)
                shouldProcessFlow = true;
            } else if (currentFlowState && !currentFlowState.isComplete) {
                shouldProcessFlow = true;
            } else if (!currentFlowState && (!conversation.messages || conversation.messages.length <= 1)) {
                // Start flow on first message
                shouldProcessFlow = true;
            }

            if (shouldProcessFlow) {
                const engine = new FlowEngine(flowData);

                if (!currentFlowState || trigger === 'init_flow') {
                    // INITIALIZE FLOW SEQUENCE
                    const sequence = engine.getStartSequence();

                    if (sequence && sequence.messages.length > 0) {
                        flowResponse = sequence.messages;
                        flowComplete = sequence.isComplete;
                        await updateConversation(conversation.id, {
                            flowState: {
                                currentStepId: sequence.currentStepId,
                                isComplete: sequence.isComplete,
                                data: {}
                            }
                        });
                    } else {
                        console.error('Flow Init Failed: Sequence is null or empty.');
                    }
                } else {
                    // CONTINUE FLOW
                    flowHandledMessage = true;
                    const currentNode = flowData.nodes?.[currentFlowState.currentStepId];
                    const result = engine.processMessage(currentFlowState, message);

                    if (result.error) {
                        console.error('Flow error:', result.error);
                        flowResponse = [{ text: 'Error: ' + result.error, options: [] }];
                    } else {
                        let messages = result.messages || [];
                        let newData = { ...currentFlowState.data, ...result.capturedData };
                        let nextState = { currentStepId: result.nextStepId, isComplete: result.isComplete };

                        // Booking node: reserve the slot before moving on
                        const picked = result.capturedData?.booking;
                        if (picked && currentNode?.type === 'booking') {
                            try {
                                const booking = await createBooking({
                                    chatbot,
                                    conversation,
                                    date: picked.date,
                                    time: picked.time,
                                    config: currentNode.booking,
                                    email: newData.email
                                });
                                messages = [{ text: `✅ Booked for **${formatSlotLabel(picked.date, picked.time)}**. See you then!`, options: [], type: 'message' }, ...messages];
                                after(async () => {
                                    await sendBookingEmails({ chatbot, booking });
                                    await upsertLead({
                                        chatbot, conversation,
                                        email: newData.email,
                                        booking: picked,
                                        intent: true,
                                        source: 'booking',
                                        note: `Booked ${picked.date} ${picked.time}`
                                    });
                                });
                            } catch (err) {
                                if (err.code !== 'SLOT_TAKEN') throw err;
                                // Slot taken meanwhile: stay on the booking node and offer fresh slots
                                delete newData.booking;
                                nextState = { currentStepId: currentFlowState.currentStepId, isComplete: false };
                                messages = [{
                                    ...engine.toMessage(currentFlowState.currentStepId, currentNode),
                                    text: 'Sorry, that slot was just taken. Please pick another time.'
                                }];
                            }
                        } else if (result.capturedData?.email && currentNode?.type === 'email') {
                            // Email node answered: becomes a lead immediately
                            after(() => upsertLead({
                                chatbot, conversation,
                                email: result.capturedData.email,
                                source: 'flow',
                                note: message
                            }));
                        }

                        await updateConversation(conversation.id, {
                            flowState: { ...nextState, data: newData },
                            // Always update persisted data to ensure we don't lose emails if flow drops
                            capturedData: newData
                        });

                        flowComplete = nextState.isComplete;
                        flowResponse = messages;

                        if (flowComplete) {
                            const lastMsg = flowResponse[flowResponse.length - 1];
                            const transitionText = 'What you want to ask next?';
                            if (!lastMsg || !lastMsg.text?.includes(transitionText)) {
                                flowResponse = [...flowResponse, { text: transitionText, options: [], type: 'text' }];
                            }
                        }
                    }
                }
            }
        }

        // If Flow produced a response (Array), return it.
        if (flowResponse) {
            const enriched = await withSlots(chatbotId, flowResponse);
            const saved = enriched.map((msg, i) => ({
                role: 'assistant',
                content: msg.text,
                options: msg.options || [],
                type: 'ai',
                flowType: msg.type || 'message',
                timestamp: new Date(Date.now() + i).toISOString()
            }));

            await Promise.all([
                addMessagesToConversation(conversation.id, saved),
                ...saved.map(m => syncRealtime(conversation.id, m))
            ]);

            return NextResponse.json({
                success: true,
                data: {
                    messages: enriched.map(m => ({ text: m.text, options: m.options || [], type: m.type, slots: m.slots })),
                    conversationId: conversation.id,
                    isFlowComplete: flowComplete
                }
            });
        }

        // =================================================================================
        // END FLOW LOGIC
        // =================================================================================

        // STOP if this was an Init Trigger that failed to produce a Flow Response
        if (trigger === 'init_flow') {
            return NextResponse.json({
                success: true,
                data: {
                    message: chatbot.welcomeMessage || 'Hello! How can I help you today?',
                    conversationId: conversation.id
                }
            });
        }

        // Free-text messages may carry contact details or buying intent
        if (!flowHandledMessage) {
            after(() => captureLeadFromMessage({ chatbot, conversation, message, source: 'chat' }));
        }

        // Section Tone & Scope Filtering
        let allowedKnowledgeIds = null;
        let sectionTone = 'Neutral';
        let sectionScope = null;

        if (sectionId) {
            const sections = await getSectionsByChatbotId(chatbotId);
            const activeSection = sections.find(s => s.id === sectionId);

            if (activeSection) {
                sectionTone = activeSection.tone || 'Neutral';
                sectionScope = {
                    ...(typeof activeSection.scope === 'object' && activeSection.scope ? activeSection.scope : {}),
                    sectionName: activeSection.name,
                    description: activeSection.description || (typeof activeSection.scope === 'string' ? activeSection.scope : '')
                };
                if (activeSection.sources && activeSection.sources.length > 0) {
                    allowedKnowledgeIds = activeSection.sources;
                }
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
            console.error('[RAG-WIDGET-CHAT] Error retrieving context:', ragErr);
        }

        let aiResponse;
        try {
            aiResponse = await generateMultiProviderCompletion({
                chatbot,
                provider: chatbot.provider || chatbot.model,
                model: chatbot.modelName,
                systemMessage: chatbot.systemMessage || 'You are a helpful assistant.',
                history: conversation.messages || [],
                userMessage: message,
                contextChunks,
                sectionTone,
                sectionScope
            });
        } catch (aiErr) {
            console.error('[AI-WIDGET-CHAT] Error generating response:', aiErr);
            aiResponse = `I'm having trouble responding right now. Please verify your AI provider API key in chatbot settings.`;
        }

        const aiMessage = {
            role: 'assistant',
            content: aiResponse,
            type: 'ai',
            timestamp: new Date().toISOString()
        };

        // Persist after responding: the visitor doesn't wait on the writes
        after(() => Promise.all([
            addMessageToConversation(conversation.id, aiMessage),
            syncRealtime(conversation.id, aiMessage)
        ]));

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
