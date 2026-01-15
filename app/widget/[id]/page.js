import ChatWidget from '@/components/widget/ChatWidget';

export default async function WidgetPage({ params }) {
    const { id } = await params;

    return (
        <div className="w-full h-full">
            <ChatWidget chatbotId={id} />
        </div>
    );
}
