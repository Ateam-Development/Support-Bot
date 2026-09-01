const { NextResponse } = require('next/server');
const { verifyAuth, optionalAuth } = require('@/lib/auth-middleware');
const { addSection, getSectionsByChatbotId, getChatbotById } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/sections/:chatbotId
 * List all sections for a chatbot (Authenticated or Widget access)
 */
export async function GET(request, { params }) {
    try {
        const { chatbotId } = await params;

        const chatbot = await getChatbotById(chatbotId);
        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        const sections = await getSectionsByChatbotId(chatbotId);

        return NextResponse.json({
            success: true,
            data: sections
        });
    } catch (error) {
        return handleApiError(error, 'fetching sections');
    }
}

/**
 * POST /api/sections/:chatbotId
 * Create a new Section for a chatbot with Tone & Scope guardrails
 */
export async function POST(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;
        const body = await request.json();

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const { name, description, sources, tone, scope } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Section name is required' },
                { status: 400 }
            );
        }

        const validTones = ['Strict', 'Neutral', 'Friendly', 'Empathetic'];
        const selectedTone = validTones.includes(tone) ? tone : 'Neutral';

        const sectionData = {
            name,
            description: description || '',
            sources: Array.isArray(sources) ? sources : [],
            tone: selectedTone,
            scope: {
                allowed: Array.isArray(scope?.allowed) ? scope.allowed : [],
                blocked: Array.isArray(scope?.blocked) ? scope.blocked : []
            }
        };

        const section = await addSection(chatbotId, sectionData);

        return NextResponse.json(
            {
                success: true,
                data: section,
                message: 'Section created successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'creating section');
    }
}
