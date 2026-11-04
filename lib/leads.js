import { getFirestore, admin } from './firebase-admin';
import { sendEmail } from './email';
import { getNotificationRecipients, appUrl, escapeHtml } from './notify';

/**
 * Leads: one document per conversation in the `leads` collection (doc id = conversationId).
 * Created when a visitor shares an email/phone (flow email node, booking, or free text in chat).
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{8,}\d)/;
const INTENT_RE = /\b(price|pricing|prices|cost|costs|quote|quotation|buy|purchase|order|book|booking|appointment|demo|interested|subscribe|subscription|plan|plans|hire|how much|call me|callback|call back|contact me|sign up|signup|enroll|enrol|package|rates?)\b/i;

export function extractContact(text) {
    if (!text || typeof text !== 'string') return {};
    const email = text.match(EMAIL_RE)?.[0]?.toLowerCase();
    const phoneRaw = text.match(PHONE_RE)?.[0];
    const digits = phoneRaw ? phoneRaw.replace(/\D/g, '') : '';
    // 10-15 digits and not a date like 2026-11-05 10:00
    const phone = digits.length >= 10 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}/.test(phoneRaw.trim())
        ? phoneRaw.trim()
        : undefined;
    return { email, phone };
}

export function hasBuyingIntent(text) {
    return !!text && INTENT_RE.test(text);
}

/**
 * hot  = phone (or booking) + buying intent
 * warm = any contact detail
 * cold = interest only
 */
export function scoreLead({ phone, email, intent, booking }) {
    if ((phone || booking) && (intent || booking)) return 'hot';
    if (phone || email) return 'warm';
    return 'cold';
}

/**
 * Create or update the lead for a conversation.
 * Returns { lead, created }.
 */
export async function upsertLead({ chatbot, conversation, email, phone, name, intent, booking, source, note }) {
    if (!chatbot || !conversation?.id) return null;
    const firestore = getFirestore();
    const ref = firestore.collection('leads').doc(conversation.id);
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : null;

    // Interest alone never creates a lead; it only upgrades an existing one
    if (!existing && !email && !phone && !booking) return null;

    const merged = {
        email: email || existing?.email || null,
        phone: phone || existing?.phone || null,
        name: name || existing?.name || null,
        intent: !!(intent || existing?.intent),
        booking: booking || existing?.booking || null,
    };
    const temperature = scoreLead(merged);

    const update = {
        ...merged,
        temperature,
        chatbotId: chatbot.id,
        conversationId: conversation.id,
        visitorId: conversation.visitorId || null,
        lastSource: source || existing?.lastSource || 'chat',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (note) update.lastMessage = String(note).slice(0, 300);

    if (!existing) {
        update.status = 'new';
        update.source = source || 'chat';
        update.notes = '';
        update.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.set(update, { merge: true });

    const lead = { id: ref.id, ...existing, ...update };
    const becameHot = existing && existing.temperature !== 'hot' && temperature === 'hot';
    if (!existing || becameHot) {
        await sendLeadAlert(chatbot, lead, !existing ? 'New lead' : 'Lead is now hot').catch(err =>
            console.error('[LEAD-ALERT] Failed:', err.message)
        );
    }

    return { lead, created: !existing };
}

/**
 * Inspect a visitor message and capture/upgrade the lead if it carries contact details or intent.
 */
export async function captureLeadFromMessage({ chatbot, conversation, message, source = 'chat' }) {
    const { email, phone } = extractContact(message);
    const intent = hasBuyingIntent(message);
    if (!email && !phone && !intent) return null;
    return upsertLead({ chatbot, conversation, email, phone, intent, source, note: message });
}

async function sendLeadAlert(chatbot, lead, heading) {
    const to = await getNotificationRecipients(chatbot);
    if (!to.length) return;

    const rows = [
        ['Temperature', lead.temperature?.toUpperCase()],
        ['Email', lead.email],
        ['Phone', lead.phone],
        ['Booking', lead.booking ? `${lead.booking.date} ${lead.booking.time}` : null],
        ['Last message', lead.lastMessage],
    ].filter(([, v]) => v);

    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
            <h2 style="color: #2563eb;">${escapeHtml(heading)} on ${escapeHtml(chatbot.name)}</h2>
            <table style="border-collapse: collapse; margin: 16px 0;">
                ${rows.map(([k, v]) => `<tr><td style="padding: 6px 16px 6px 0; color: #64748b;">${k}</td><td style="padding: 6px 0;"><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
            </table>
            <a href="${appUrl(`/leads/${chatbot.id}`)}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Open Leads
            </a>
        </div>
    `;
    await sendEmail(to, `[${lead.temperature === 'hot' ? 'Hot lead' : 'Lead'}] ${heading} - ${chatbot.name}`, html);
}

export async function getLeadsByChatbotId(chatbotId) {
    const snapshot = await getFirestore().collection('leads').where('chatbotId', '==', chatbotId).get();
    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.().toISOString() || null,
                updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
            };
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function updateLead(leadId, chatbotId, updates) {
    const ref = getFirestore().collection('leads').doc(leadId);
    const snap = await ref.get();
    if (!snap.exists || snap.data().chatbotId !== chatbotId) return null;

    const allowed = {};
    if (['new', 'contacted', 'won', 'lost'].includes(updates.status)) allowed.status = updates.status;
    if (typeof updates.notes === 'string') allowed.notes = updates.notes.slice(0, 2000);
    if (typeof updates.name === 'string') allowed.name = updates.name.slice(0, 120);

    await ref.update({ ...allowed, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { id: leadId, ...snap.data(), ...allowed };
}
