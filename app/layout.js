import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/components/widget/widget.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Adeptimize Solutions - Chatbot Dashboard",
  description: "Manage your chatbots, knowledge base, and conversations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Suppress browser extension unhandled runtime errors
                window.addEventListener('error', function(e) {
                  if (e.filename && (e.filename.includes('chrome-extension://') || e.filename.includes('moz-extension://'))) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                  if (e.message && (e.message.includes('M_ID') || e.message.includes('bis_skin_checked'))) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  const reason = (e.reason && (e.reason.stack || e.reason.message)) || '';
                  if (reason.includes('chrome-extension://') || reason.includes('moz-extension://')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                // Filter out extension-injected hydration warnings in dev console
                const origConsoleError = console.error;
                console.error = function(...args) {
                  const msg = args.map(a => typeof a === 'string' ? a : (a?.message || '')).join(' ');
                  if (msg.includes('bis_skin_checked') || msg.includes('chrome-extension://') || msg.includes('M_ID')) {
                    return;
                  }
                  origConsoleError.apply(console, args);
                };
              }
            `
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full bg-black text-white`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
