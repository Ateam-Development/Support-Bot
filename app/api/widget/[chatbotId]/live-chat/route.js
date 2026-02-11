import { NextResponse } from 'next/server';
import { getChatbotById, createConversation, addMessageToConversation, getConversationById, getConversationByVisitorId } from '@/lib/db';
import { addRealtimeMessage, checkUserStatus } from '@/lib/firebase-realtime';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/widget/:chatbotId/live-chat
 * Public endpoint for sending live chat messages from widget
 * No authentication required
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, conversationId, visitorId } = await request.json();

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
            type: 'live', // This is a live chat message
            timestamp: new Date().toISOString()
        };
        await addMessageToConversation(conversation.id, userMessage);

        // Sync to Realtime DB for instant delivery
        try {
            await addRealtimeMessage(conversation.id, userMessage);
        } catch (e) {
            console.error('Realtime DB sync failed:', e);
        }

        // Check for offline email notification
        try {
            const ownerStatus = await checkUserStatus(chatbot.userId);
            const isOffline = !ownerStatus.online;
            const lastSeenDiff = Date.now() - (ownerStatus.lastSeen || 0);
            const isInactive = lastSeenDiff > 5 * 60 * 1000; // 5 minutes

            if (isOffline || isInactive) {
                // Fetch fresh chatbot data to get latest emails
                // We already have 'chatbot' object but it might be stale if updated recently
                // However, for performance we can use the one we fetched
                const emails = chatbot.notificationEmails;

                if (emails && emails.length > 0) {
                    const subject = `New message from ${visitorId || 'Visitor'} - ${chatbot.name}`;
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>New Message Received</h2>
                            <p>You have a new message from <strong>${visitorId || 'Visitor'}</strong> on <strong>${chatbot.name}</strong>.</p>
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
                }
            }
        } catch (emailError) {
            console.error('Failed to send notification email:', emailError);
            // Don't fail the request
        }

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                visitorId: conversation.visitorId
            }
        });

    } catch (error) {
        console.error('Live chat error:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError', message: 'Failed to process message' },
            { status: 500 }
        );
    }
}
