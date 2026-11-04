import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/api-utils';
import { getFirestore } from '@/lib/firebase-admin';
import { getChatbotsByUserId } from '@/lib/db';

const TIMEZONE = 'Asia/Kolkata';

const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
const hourOf = (date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(date));
const toDate = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    const d = new Date(value);
    return isNaN(d) ? null : d;
};

// Flow answers, emails and slot picks are not real questions
const isQuestionLike = (text) =>
    typeof text === 'string' &&
    text.trim().length >= 8 &&
    !/^\d{4}-\d{2}-\d{2}/.test(text.trim()) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

async function queryByChatbots(collection, chatbotIds) {
    const firestore = getFirestore();
    const snaps = await Promise.all(
        chatbotIds.map(id => firestore.collection(collection).where('chatbotId', '==', id).get())
    );
    return snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
}

/**
 * GET /api/analytics?chatbotId=<id|all>&days=30
 */
export async function GET(request) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { searchParams } = new URL(request.url);
        const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days')) || 30));
        const requested = searchParams.get('chatbotId') || 'all';

        const ownBots = await getChatbotsByUserId(authResult.user.uid);
        const botIds = requested === 'all'
            ? ownBots.map(b => b.id)
            : ownBots.filter(b => b.id === requested).map(b => b.id);

        if (requested !== 'all' && botIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Forbidden', message: 'You do not have access to this chatbot' }, { status: 403 });
        }

        const [conversations, leads, bookings] = await Promise.all([
            queryByChatbots('conversations', botIds),
            queryByChatbots('leads', botIds),
            queryByChatbots('bookings', botIds)
        ]);

        // Day buckets, oldest first
        const now = new Date();
        const series = [];
        const index = {};
        for (let i = days - 1; i >= 0; i--) {
            const key = dayKey(new Date(now.getTime() - i * 86400000));
            if (index[key] === undefined) {
                index[key] = series.length;
                series.push({ date: key, conversations: 0, leads: 0, bookings: 0 });
            }
        }
        const since = new Date(`${series[0].date}T00:00:00+05:30`);

        const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, messages: 0 }));
        const questionCounts = new Map();
        let conversationCount = 0;
        let visitorMessages = 0;
        let liveChats = 0;
        let engaged = 0;

        for (const conv of conversations) {
            const created = toDate(conv.createdAt);
            const userMsgs = (conv.messages || []).filter(m => m.role === 'user');
            const inRange = created && created >= since;

            if (inRange) {
                conversationCount++;
                const i = index[dayKey(created)];
                if (i !== undefined) series[i].conversations++;
                if (userMsgs.some(m => m.type === 'live')) liveChats++;
                if (userMsgs.length > 0) engaged++;
            }

            for (const msg of userMsgs) {
                const at = toDate(msg.timestamp);
                if (!at || at < since) continue;
                visitorMessages++;
                hours[hourOf(at)].messages++;

                const text = (msg.content || msg.text || '').trim();
                if (msg.type !== 'live' && isQuestionLike(text)) {
                    const key = text.toLowerCase().replace(/[?!.\s]+$/, '');
                    const entry = questionCounts.get(key) || { question: text, count: 0 };
                    entry.count++;
                    questionCounts.set(key, entry);
                }
            }
        }

        let leadCount = 0;
        let hotLeads = 0;
        let wonLeads = 0;
        for (const lead of leads) {
            const created = toDate(lead.createdAt);
            if (!created || created < since) continue;
            leadCount++;
            if (lead.temperature === 'hot') hotLeads++;
            if (lead.status === 'won') wonLeads++;
            const i = index[dayKey(created)];
            if (i !== undefined) series[i].leads++;
        }

        let bookingCount = 0;
        let upcomingBookings = 0;
        for (const booking of bookings) {
            if (booking.status === 'cancelled') continue;
            if (booking.startsAt && new Date(booking.startsAt) > now) upcomingBookings++;
            const created = toDate(booking.createdAt);
            if (!created || created < since) continue;
            bookingCount++;
            const i = index[dayKey(created)];
            if (i !== undefined) series[i].bookings++;
        }

        const topQuestions = [...questionCounts.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        return NextResponse.json({
            success: true,
            data: {
                range: { days, since: since.toISOString(), timezone: TIMEZONE },
                bots: ownBots.map(b => ({ id: b.id, name: b.name })),
                totals: {
                    conversations: conversationCount,
                    engagedConversations: engaged,
                    visitorMessages,
                    liveChats,
                    leads: leadCount,
                    hotLeads,
                    wonLeads,
                    leadRate: conversationCount ? Math.round((leadCount / conversationCount) * 100) : 0,
                    bookings: bookingCount,
                    upcomingBookings
                },
                series,
                hours,
                topQuestions
            }
        });
    } catch (error) {
        return handleApiError(error, 'loading analytics');
    }
}
