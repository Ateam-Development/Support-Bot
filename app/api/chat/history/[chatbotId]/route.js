const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');

/**
 * GET /api/chat/history/:chatbotId
 * Get chat history for authenticated user and specific chatbot
 * DEPRECATED: Use /api/conversations/:chatbotId instead
 */
export async function GET(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        return NextResponse.json({
            success: true,
            data: [],
            message: 'Please use /api/conversations/:chatbotId endpoint instead'
        });
    } catch (error) {
        console.error('Error fetching chat history:', error.message);

        return NextResponse.json(
            {
                success: false,
                error: 'InternalError',
                message: 'Error fetching chat history'
            },
            { status: 500 }
        );
    }
}
