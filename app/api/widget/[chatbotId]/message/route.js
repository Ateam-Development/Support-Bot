const { NextResponse } = require('next/server');
const {
    getChatbotById,
    createConversation,
    addMessageToConversation,
    getConversationById,
    getKnowledgeByChatbotId
} = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');
const { checkUserStatus } = require('@/lib/firebase-realtime');
const { sendEmail } = require('@/lib/email');

/**
 * POST /api/widget/:chatbotId/message
 * Send message from widget (public endpoint)
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, conversationId } = await request.json();

        if (!message) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'Message is required'
                },
                { status: 400 }
            );
        }

        // Get chatbot
        const chatbot = await getChatbotById(chatbotId);
        if (!chatbot) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NotFound',
                    message: 'Chatbot not found'
                },
                { status: 404 }
            );
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await getConversationById(conversationId);
            if (!conversation || conversation.chatbotId !== chatbotId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'NotFound',
                        message: 'Conversation not found'
                    },
                    { status: 404 }
                );
            }
        } else {
            conversation = await createConversation(chatbotId, null); // Anonymous user
        }

        // Add user message
        const userMessage = {
            role: 'user',
            text: message,
            timestamp: new Date().toISOString()
        };

        await addMessageToConversation(conversation.id, userMessage);

        // Get knowledge base
        const knowledge = await getKnowledgeByChatbotId(chatbotId);

        // TODO: Implement AI model integration
        const welcomeMsg = chatbot.welcomeMessage || 'Hi there! How can I assist you today?';
        const botResponse = {
            role: 'assistant',
            text: `Thank you for your message! You said: "${message}"\n\nThis is a placeholder response. AI integration coming soon!\n\nKnowledge base items: ${knowledge.length}`,
            timestamp: new Date().toISOString()
        };

        await addMessageToConversation(conversation.id, botResponse);

        // Check for offline email notification
        try {
            // Re-fetch conversation to ensure we have latest data including emails if existing
            const currentConv = await getConversationById(conversation.id);
            const ownerStatus = await checkUserStatus(chatbot.userId);
            const isOffline = !ownerStatus.online;
            const lastSeenDiff = Date.now() - (ownerStatus.lastSeen || 0);
            const isInactive = lastSeenDiff > 5 * 60 * 1000; // 5 minutes

            console.log(`[DEBUG-EMAIL] Checking presence for user ${chatbot.userId}`);
            console.log(`[DEBUG-EMAIL] Status: online=${ownerStatus.online}, lastSeen=${new Date(ownerStatus.lastSeen).toISOString()}`);
            console.log(`[DEBUG-EMAIL] Diff: ${lastSeenDiff}ms, Threshold: ${5 * 60 * 1000}ms`);
            console.log(`[DEBUG-EMAIL] Decision: isOffline=${isOffline}, isInactive=${isInactive}, SEND=${isOffline || isInactive}`);

            if (isOffline || isInactive) {
                // Use chatbot emails
                const emails = chatbot.notificationEmails;
                console.log(`[DEBUG-EMAIL] Notification emails:`, emails);

                if (emails && emails.length > 0) {
                    const subject = `New message from ${currentConv.visitorId || 'Visitor'} - ${chatbot.name}`;
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>New Message Received</h2>
                            <p>You have a new message from <strong>${currentConv.visitorId || 'Visitor'}</strong> on <strong>${chatbot.name}</strong>.</p>
                            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                                ${message}
                            </blockquote>
                            <p style="color: #666; font-size: 14px;">
                                You are receiving this because you are currently offline or inactive on the dashboard.
                            </p>
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conversations" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                View Conversation
                            </a>
                        </div>
                    `;

                    await sendEmail(emails, subject, html);
                    console.log(`[DEBUG-EMAIL] Email sent successfully.`);
                } else {
                    console.log(`[DEBUG-EMAIL] No emails found for chatbot.`);
                }
            }
        } catch (emailError) {
            console.error('Failed to send notification email:', emailError);
        }

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                message: botResponse.text,
                timestamp: botResponse.timestamp
            }
        });
    } catch (error) {
        return handleApiError(error, 'processing message');
    }
}

