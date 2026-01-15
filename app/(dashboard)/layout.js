import Sidebar from "@/components/Sidebar";
import { ChatbotProvider } from "@/contexts/ChatbotContext";

export default function DashboardLayout({ children }) {
    return (
        <div className="flex w-full h-full">
            <ChatbotProvider>
                <Sidebar />
                <main className="flex-1 h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-950 relative">
                    {/* Global Background Effects */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                    </div>
                    <div className="relative z-10 w-full h-full flex flex-col">
                        {children}
                    </div>
                </main>
            </ChatbotProvider>
        </div>
    );
}
