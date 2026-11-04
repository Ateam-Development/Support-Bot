/**
 * Embed snippet for a chatbot. Uses the domain the dashboard is served from,
 * so it always matches the current deployment (e.g. https://support-bot-neon.vercel.app).
 */
export function widgetSnippet(chatbotId) {
    const origin = typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || '');
    return `<script src="${origin}/widget.js" data-id="${chatbotId}" defer></script>`;
}
