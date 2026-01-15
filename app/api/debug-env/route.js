import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const envVars = {
        FIREBASE_PROJECT_ID: {
            exists: !!process.env.FIREBASE_PROJECT_ID,
            value: process.env.FIREBASE_PROJECT_ID ? process.env.FIREBASE_PROJECT_ID : 'MISSING'
        },
        FIREBASE_CLIENT_EMAIL: {
            exists: !!process.env.FIREBASE_CLIENT_EMAIL,
            value: process.env.FIREBASE_CLIENT_EMAIL ? process.env.FIREBASE_CLIENT_EMAIL : 'MISSING'
        },
        FIREBASE_PRIVATE_KEY: {
            exists: !!process.env.FIREBASE_PRIVATE_KEY,
            length: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
            hasBegin: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') : false,
            hasEnd: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('END PRIVATE KEY') : false,
            // DO NOT LOG THE ACTUAL KEY
        }
    };

    return NextResponse.json({
        success: true,
        env: envVars,
        message: 'Depoyment Debugger'
    });
}
