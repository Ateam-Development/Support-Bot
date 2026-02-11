import { NextResponse } from 'next/server';
import { getFlow, saveFlow } from '@/lib/db';

export async function GET(request, { params }) {
    try {
        const { chatbotId } = await params;
        const flow = await getFlow(chatbotId);

        return NextResponse.json({ success: true, data: flow });
    } catch (error) {
        console.error('Failed to fetch flow:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError' },
            { status: 500 }
        );
    }
}

export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const body = await request.json();

        console.log(`Flow API: Saving flow for chatbot ${chatbotId}`);
        console.log(`Flow API: Received startNodeId: ${body.startNodeId}`);
        console.log(`Flow API: Received node count: ${Object.keys(body.nodes || {}).length}`);
        console.log(`Flow API: Received node IDs: ${Object.keys(body.nodes || {}).join(', ')}`);

        const flow = await saveFlow(chatbotId, body);

        return NextResponse.json({ success: true, data: flow });
    } catch (error) {
        console.error('Failed to save flow:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError' },
            { status: 500 }
        );
    }
}
