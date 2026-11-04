import { getFirestore, admin } from './firebase-admin';
import { sendEmail } from './email';
import { getNotificationRecipients, appUrl, escapeHtml } from './notify';

/**
 * Bookings: appointment slots offered by a "booking" flow node.
 * Doc id = `${chatbotId}_${date}_${HHMM}` so two visitors can never hold the same slot.
 */

export const DEFAULT_BOOKING_CONFIG = {
    days: [1, 2, 3, 4, 5], // 0 = Sunday
    startTime: '09:00',
    endTime: '17:00',
    slotMinutes: 30,
    daysAhead: 7,
    timezone: 'Asia/Kolkata',
};

export const SLOT_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/;

const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};
const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export function normalizeConfig(config = {}) {
    const merged = { ...DEFAULT_BOOKING_CONFIG, ...config };
    merged.slotMinutes = Math.max(10, Number(merged.slotMinutes) || 30);
    merged.daysAhead = Math.min(60, Math.max(1, Number(merged.daysAhead) || 7));
    if (!Array.isArray(merged.days) || merged.days.length === 0) merged.days = DEFAULT_BOOKING_CONFIG.days;
    return merged;
}

/** Current date (YYYY-MM-DD) and minutes-since-midnight in a timezone */
function nowInZone(timezone) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date()).map(p => [p.type, p.value])
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function addDays(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/** Convert a wall-clock time in `timezone` to a UTC Date */
export function zonedToUtc(date, time, timezone) {
    const guess = new Date(`${date}T${time}:00Z`);
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(guess).map(p => [p.type, p.value])
    );
    const asZone = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return new Date(guess.getTime() - (asZone - guess.getTime()));
}

export function formatSlotLabel(date, time) {
    const d = new Date(`${date}T00:00:00Z`);
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const [h, m] = time.split(':').map(Number);
    const t = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    return `${day}, ${t}`;
}

async function getTakenSlots(chatbotId, fromDate) {
    const snapshot = await getFirestore().collection('bookings').where('chatbotId', '==', chatbotId).get();
    const taken = new Set();
    snapshot.docs.forEach(doc => {
        const b = doc.data();
        if (b.status !== 'cancelled' && b.date >= fromDate) taken.add(`${b.date} ${b.time}`);
    });
    return taken;
}

/**
 * Open slots grouped by day: [{ date, label, times: ['09:00', ...] }]
 */
export async function getAvailableSlots(chatbotId, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const now = nowInZone(config.timezone);
    const taken = await getTakenSlots(chatbotId, now.date);
    const start = toMinutes(config.startTime);
    const end = toMinutes(config.endTime);
    const days = config.days.map(Number);

    const result = [];
    for (let i = 0; i < config.daysAhead; i++) {
        const date = addDays(now.date, i);
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        if (!days.includes(weekday)) continue;

        const times = [];
        for (let m = start; m + config.slotMinutes <= end; m += config.slotMinutes) {
            // Same-day slots need at least 30 minutes notice
            if (i === 0 && m <= now.minutes + 30) continue;
            const time = toHHMM(m);
            if (!taken.has(`${date} ${time}`)) times.push(time);
        }
        if (times.length > 0) {
            const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
            result.push({ date, label, times });
        }
    }
    return result;
}

/**
 * Reserve a slot. Throws an Error with code 'SLOT_TAKEN' when someone else holds it.
 */
export async function createBooking({ chatbot, conversation, date, time, config: rawConfig, email, name, phone }) {
    const config = normalizeConfig(rawConfig);
    const firestore = getFirestore();
    const ref = firestore.collection('bookings').doc(`${chatbot.id}_${date}_${time.replace(':', '')}`);
    const startsAt = zonedToUtc(date, time, config.timezone);

    const booking = {
        chatbotId: chatbot.id,
        conversationId: conversation.id,
        visitorId: conversation.visitorId || null,
        date,
        time,
        durationMinutes: config.slotMinutes,
        timezone: config.timezone,
        startsAt: startsAt.toISOString(),
        email: email || null,
        name: name || null,
        phone: phone || null,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.data().status !== 'cancelled') {
            const err = new Error('Slot already booked');
            err.code = 'SLOT_TAKEN';
            throw err;
        }
        tx.set(ref, booking);
    });

    return { id: ref.id, ...booking };
}

function buildIcs({ booking, chatbot }) {
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const start = new Date(booking.startsAt);
    const end = new Date(start.getTime() + booking.durationMinutes * 60000);
    const summary = `Appointment via ${chatbot.name}`.replace(/[,;]/g, ' ');
    const description = [
        booking.email && `Email: ${booking.email}`,
        booking.phone && `Phone: ${booking.phone}`,
        `Visitor: ${booking.visitorId || 'Visitor'}`,
    ].filter(Boolean).join('\\n');

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Adeptimize Solutions//Chatbot Bookings//EN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${booking.id}@adeptimize`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

/**
 * Email the owner (and the visitor, when we have their email) with a calendar invite.
 */
export async function sendBookingEmails({ chatbot, booking }) {
    const ics = buildIcs({ booking, chatbot });
    const attachments = [{ filename: 'invite.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=REQUEST' }];
    const when = `${formatSlotLabel(booking.date, booking.time)} (${booking.timezone})`;

    const owners = await getNotificationRecipients(chatbot);
    const jobs = [];
    if (owners.length) {
        jobs.push(sendEmail(owners, `[Booking] ${when} - ${chatbot.name}`, `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
                <h2 style="color: #2563eb;">New appointment booked</h2>
                <p>A visitor booked <strong>${escapeHtml(when)}</strong> on <strong>${escapeHtml(chatbot.name)}</strong>.</p>
                ${booking.email ? `<p>Email: <strong>${escapeHtml(booking.email)}</strong></p>` : ''}
                ${booking.phone ? `<p>Phone: <strong>${escapeHtml(booking.phone)}</strong></p>` : ''}
                <a href="${appUrl(`/bookings/${chatbot.id}`)}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">Open Bookings</a>
            </div>
        `, attachments));
    }
    if (booking.email) {
        jobs.push(sendEmail([booking.email], `Your appointment with ${chatbot.name}`, `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
                <h2 style="color: #2563eb;">You're booked!</h2>
                <p>Your appointment with <strong>${escapeHtml(chatbot.name)}</strong> is confirmed for <strong>${escapeHtml(when)}</strong>.</p>
                <p style="color: #64748b; font-size: 13px;">The attached invite adds it to your calendar.</p>
            </div>
        `, attachments));
    }
    const results = await Promise.allSettled(jobs);
    results.forEach(r => r.status === 'rejected' && console.error('[BOOKING-EMAIL] Failed:', r.reason?.message));
}

export async function getBookingsByChatbotId(chatbotId) {
    const snapshot = await getFirestore().collection('bookings').where('chatbotId', '==', chatbotId).get();
    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, createdAt: data.createdAt?.toDate?.().toISOString() || null };
        })
        .sort((a, b) => (a.startsAt || '').localeCompare(b.startsAt || ''));
}

export async function updateBookingStatus(bookingId, chatbotId, status) {
    if (!['confirmed', 'cancelled', 'completed'].includes(status)) return null;
    const ref = getFirestore().collection('bookings').doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists || snap.data().chatbotId !== chatbotId) return null;
    await ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { id: bookingId, ...snap.data(), status };
}
