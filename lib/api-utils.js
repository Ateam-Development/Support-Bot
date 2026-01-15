import { NextResponse } from 'next/server';
import { getChatbotById } from './db';

/**
 * Standardized success response
 */
function successResponse(data, status = 200) {
    return NextResponse.json(
        {
            success: true,
            data
        },
        { status }
    );
}

/**
 * Standardized error response
 */
function errorResponse(message, error = 'Error', status = 500) {
    return NextResponse.json(
        {
            success: false,
            error,
            message
        },
        { status }
    );
}

/**
 * Verify chatbot ownership
 * Returns chatbot if user owns it, or error response if not
 */
async function verifyChatbotOwnership(chatbotId, userId) {
    const chatbot = await getChatbotById(chatbotId);

    if (!chatbot) {
        return {
            error: NextResponse.json(
                {
                    success: false,
                    error: 'NotFound',
                    message: 'Chatbot not found'
                },
                { status: 404 }
            )
        };
    }

    if (chatbot.userId !== userId) {
        return {
            error: NextResponse.json(
                {
                    success: false,
                    error: 'Forbidden',
                    message: 'You do not have access to this chatbot'
                },
                { status: 403 }
            )
        };
    }

    return { chatbot };
}

/**
 * Handle API errors consistently
 */
function handleApiError(error, context = 'processing request') {
    console.error(`Error ${context}:`, error.message);

    return NextResponse.json(
        {
            success: false,
            error: 'InternalError',
            message: `Error ${context}`
        },
        { status: 500 }
    );
}

export {
    successResponse,
    errorResponse,
    verifyChatbotOwnership,
    handleApiError
};
