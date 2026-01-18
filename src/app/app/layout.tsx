import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div 
            className="min-h-screen bg-watercolor-paper dark:bg-black"
            style={{ minHeight: '100vh', backgroundColor: '#faf8f5' }}
        >
            {children}
        </div>
    );
}

