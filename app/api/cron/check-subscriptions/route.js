const { NextResponse } = require('next/server');
const { getFirestore } = require('@/lib/firebase-admin');
const { sendEmail } = require('@/lib/email');

/**
 * GET /api/cron/check-subscriptions
 * Cron job to check user subscription statuses, automatically disable/enable chatbots, and send reminder emails
 * Secured via Bearer CRON_SECRET header or secret query parameter
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const secretParam = searchParams.get('secret');
        const authHeader = request.headers.get('authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '').trim() : secretParam;

        const CRON_SECRET = process.env.CRON_SECRET;

        if (CRON_SECRET && token !== CRON_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized', message: 'Invalid or missing cron secret' },
                { status: 401 }
            );
        }

        const firestore = getFirestore();

        // 1. Fetch all users
        const usersSnapshot = await firestore.collection('users').get();
        if (usersSnapshot.empty) {
            return NextResponse.json({
                success: true,
                message: 'No users found to check.'
            });
        }

        const now = new Date();
        const results = {
            processedUsers: 0,
            disabledBotsCount: 0,
            enabledBotsCount: 0,
            emailsSentCount: 0
        };

        // 2. Parallelized user processing using Promise.all
        await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            results.processedUsers++;

            const planExpiry = userData.planExpiry ? new Date(userData.planExpiry) : null;
            let daysLeft = 999;

            if (planExpiry) {
                const diffTime = planExpiry.getTime() - now.getTime();
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const isExpired = daysLeft <= 0;
            const isNearExpiry = daysLeft > 0 && daysLeft <= 2;

            // Fetch user's chatbots
            const chatbotsSnapshot = await firestore
                .collection('chatbots')
                .where('userId', '==', userId)
                .get();

            if (!chatbotsSnapshot.empty) {
                const batch = firestore.batch();
                let batchCount = 0;

                chatbotsSnapshot.docs.forEach(botDoc => {
                    const botData = botDoc.data();
                    const shouldDisable = isExpired;

                    if (botData.disabled !== shouldDisable) {
                        batch.update(botDoc.ref, {
                            disabled: shouldDisable,
                            updatedAt: new Date()
                        });
                        batchCount++;

                        if (shouldDisable) {
                            results.disabledBotsCount++;
                        } else {
                            results.enabledBotsCount++;
                        }
                    }
                });

                if (batchCount > 0) {
                    await batch.commit();
                }
            }

            // Dispatch reminder emails if applicable
            if (userData.email) {
                if (isExpired && !userData.expiryNoticeSent) {
                    const subject = 'Your Chatbot Subscription Has Expired';
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2>Subscription Expired</h2>
                            <p>Hi ${userData.name || 'User'},</p>
                            <p>Your chatbot subscription plan has expired. Your chatbots have been set to inactive status.</p>
                            <p>Please renew your plan to reactivate your chatbots and restore service.</p>
                        </div>
                    `;
                    try {
                        await sendEmail([userData.email], subject, html);
                        await userDoc.ref.update({ expiryNoticeSent: true });
                        results.emailsSentCount++;
                    } catch (e) {
                        console.error(`[CRON] Email failed for user ${userId}:`, e);
                    }
                } else if (isNearExpiry && !userData.warningNoticeSent) {
                    const subject = 'Urgent: Your Chatbot Subscription Expires in 2 Days';
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2>Subscription Expiring Soon</h2>
                            <p>Hi ${userData.name || 'User'},</p>
                            <p>Your subscription will expire in <strong>${daysLeft} day(s)</strong>. Renew now to avoid chatbot service interruption.</p>
                        </div>
                    `;
                    try {
                        await sendEmail([userData.email], subject, html);
                        await userDoc.ref.update({ warningNoticeSent: true });
                        results.emailsSentCount++;
                    } catch (e) {
                        console.error(`[CRON] Warning email failed for user ${userId}:`, e);
                    }
                }
            }
        }));

        console.log('[CRON-CHECK-SUBSCRIPTIONS] Finished successfully:', results);

        return NextResponse.json({
            success: true,
            data: results,
            message: 'Subscription check and chatbot status enforcement executed successfully'
        });
    } catch (error) {
        console.error('[CRON-ERROR]', error);
        return NextResponse.json(
            { success: false, error: 'ServerError', message: error.message },
            { status: 500 }
        );
    }
}
