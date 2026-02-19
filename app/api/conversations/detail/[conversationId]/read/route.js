import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getConversationById, getChatbotById, markConversationAsRead } from '@/lib/db';
import { updateConversationMetadata } from '@/lib/firebase-realtime';
import { handleApiError } from '@/lib/api-utils';

/**
 * POST /api/conversations/detail/:conversationId/read
 * Mark a conversation as read
 */
export async function POST(request, { params }) {
    try {
        const { conversationId } = await params;

        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;

        // Get conversation and verify ownership
        const conversation = await getConversationById(conversationId);
        if (!conversation) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Verify user owns the chatbot
        const chatbot = await getChatbotById(conversation.chatbotId);
        if (!chatbot || chatbot.userId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        // Mark as read in Firestore and get the previous unread count
        // Note: markConversationAsRead in db.js currently doesn't return the old count, 
        // but we have the conversation object from line 24.
        const unreadCountToSubtract = conversation.unreadCount || 0;
        await markConversationAsRead(conversationId);

        // Update metadata in Realtime DB
        try {
            const { getRealtimeDb } = require('@/lib/firebase-admin');
            const rtdb = getRealtimeDb();

            // 1. Reset conversation metadata unreadCount
            const metadataRef = rtdb.ref(`conversations/${conversationId}/metadata`);
            await metadataRef.update({
                unreadCount: 0
            });

            // 2. Decrement global chatbot stats
            if (unreadCountToSubtract > 0) {
                const statsRef = rtdb.ref(`chatbots/${conversation.chatbotId}/stats`);
                await statsRef.update({
                    unreadCount: require('firebase-admin').database.ServerValue.increment(-unreadCountToSubtract)
                });
            }
        } catch (realtimeError) {
            console.error('Failed to update Realtime DB metadata:', realtimeError);
            // Continue even if Realtime DB fails
        }

        return NextResponse.json({
            success: true,
            message: 'Conversation marked as read'
        });

    } catch (error) {
        return handleApiError(error, 'marking conversation as read');
    }
}
