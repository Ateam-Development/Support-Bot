import ChatWidget from '@/components/widget/ChatWidget';

export default async function WidgetPage({ params }) {
    const { id } = await params;

    return (
        <div className="w-full h-full">
            <style>{`
                html, body {
                    background: transparent !important;
                }
            `}</style>
            <ChatWidget chatbotId={id} />
        </div>
    );
}
