const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getSectionsByChatbotId, addSection } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/sections/:chatbotId
 * List all sections for a chatbot
 */
export async function GET(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

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
 * Create a new section
 */
export async function POST(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const resolvedParams = await params;
        const { chatbotId } = resolvedParams;

        console.log('Sections POST - params:', resolvedParams);
        console.log('Sections POST - chatbotId:', chatbotId);

        if (!chatbotId) {
            return NextResponse.json({ success: false, error: 'BadRequest', message: 'Chatbot ID is missing' }, { status: 400 });
        }

        const sectionData = await request.json();

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        if (!sectionData.name) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Section name is required' },
                { status: 400 }
            );
        }

        const newSection = await addSection(chatbotId, sectionData);

        return NextResponse.json({
            success: true,
            data: newSection
        }, { status: 201 });

    } catch (error) {
        return handleApiError(error, 'creating section');
    }
}

/**
 * DELETE /api/sections/:chatbotId
 * Delete a section
 */
export async function DELETE(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const resolvedParams = await params;
        const { chatbotId } = resolvedParams;
        const { sectionId } = await request.json();

        if (!chatbotId || !sectionId) {
            return NextResponse.json({ success: false, error: 'BadRequest', message: 'Chatbot ID and Section ID are required' }, { status: 400 });
        }

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const { getFirestore } = require('@/lib/firebase-admin');
        const firestore = getFirestore();
        await firestore.collection('sections').doc(sectionId).delete();

        return NextResponse.json({ success: true, message: 'Section deleted successfully' });

    } catch (error) {
        return handleApiError(error, 'deleting section');
    }
}

/**
 * PUT /api/sections/:chatbotId
 * Update a section
 */
export async function PUT(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const resolvedParams = await params;
        const { chatbotId } = resolvedParams;

        const data = await request.json();
        const { sectionId, ...updates } = data;

        if (!chatbotId || !sectionId) {
            return NextResponse.json({ success: false, error: 'BadRequest', message: 'Chatbot ID and Section ID are required' }, { status: 400 });
        }

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const { getFirestore, admin } = require('@/lib/firebase-admin');
        const firestore = getFirestore();
        const sectionRef = firestore.collection('sections').doc(sectionId);

        await sectionRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const updatedDoc = await sectionRef.get();

        return NextResponse.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });

    } catch (error) {
        return handleApiError(error, 'updating section');
    }
}
