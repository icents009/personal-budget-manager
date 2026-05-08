import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { InitDb } from "@/components/InitDb";
import { ServiceWorker } from "@/components/ServiceWorker";

// Using system font stack instead of Google Fonts so the app builds offline
// and works without an internet connection during deployment

export const metadata: Metadata = {
  title: "Personal Budget Manager",
  description: "Track your income, expenses, savings, and debts — stored locally on your device.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Budget Manager",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning silences false-positive mismatches caused by
          browser extensions (e.g. ColorZilla) that inject attributes like
          cz-shortcut-listen onto <body> after React's server render */}
      <body className="bg-slate-50 text-slate-900 font-sans antialiased" suppressHydrationWarning>
        <ToastProvider>
          {/* Seed the database with defaults on first load */}
          <InitDb />
          {/* Register service worker for offline/PWA support */}
          <ServiceWorker />

          {/* Desktop sidebar — hidden on mobile */}
          <Sidebar />

          {/* Main content — shifts right on desktop to make room for sidebar */}
          <div className="md:pl-56 min-h-screen flex flex-col">
            {/* Mobile top header */}
            <Header />

            {/* Page content */}
            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
              {children}
            </main>
          </div>

          {/* Mobile bottom navigation */}
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
