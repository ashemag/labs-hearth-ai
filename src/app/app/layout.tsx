import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div
            className="min-h-screen bg-white dark:bg-black"
            style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}
        >
            {children}
        </div>
    );
}

