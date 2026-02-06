import { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div
            className="min-h-screen bg-white dark:bg-black"
            style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}
        >
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
            <Toaster position="bottom-right" richColors />
        </div>
    );
}

