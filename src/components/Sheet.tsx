"use client";

import { useEffect, useRef, useState, ReactNode, createContext, useContext } from "react";

interface SheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    side?: "left" | "right";
    className?: string;
    modal?: boolean; // When false, allows interaction with main page
    defaultOpen?: boolean; // If true, skip initial open animation
    closeOnClickOutside?: boolean; // When false, don't close when clicking outside
    expanded?: boolean; // When true, sheet takes full width
}

interface SheetContentProps {
    children: ReactNode;
    className?: string;
}

interface SheetHeaderProps {
    children: ReactNode;
    className?: string;
}

interface SheetTitleProps {
    children: ReactNode;
    className?: string;
}

interface SheetDescriptionProps {
    children: ReactNode;
    className?: string;
}

interface SheetContextValue {
    onClose: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheetContext() {
    return useContext(SheetContext);
}

export function Sheet({ open, onOpenChange, children, side = "right", className = "", modal = false, defaultOpen = false, closeOnClickOutside = true, expanded = false }: SheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(open);
    const [skipOpenAnimation, setSkipOpenAnimation] = useState(defaultOpen && open);
    const hasAnimatedRef = useRef(false);

    // Handle open/close with animation
    useEffect(() => {
        if (open) {
            setShouldRender(true);
            setIsClosing(false);
            // After first render, always animate
            if (hasAnimatedRef.current) {
                setSkipOpenAnimation(false);
            }
        } else if (shouldRender) {
            // Start closing animation
            setIsClosing(true);
            hasAnimatedRef.current = true;
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 300); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [open, shouldRender]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                onOpenChange(false);
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onOpenChange]);

    // Handle click outside (when not in modal mode and closeOnClickOutside is true)
    useEffect(() => {
        if (!open || modal || !closeOnClickOutside) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
                onOpenChange(false);
            }
        };

        // Delay adding listener to prevent immediate close from the click that opened it
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, modal, closeOnClickOutside, onOpenChange]);

    if (!shouldRender) return null;

    const getAnimationClass = () => {
        if (isClosing) {
            return side === "right" ? "animate-slide-out-right" : "animate-slide-out-left";
        }
        if (skipOpenAnimation) {
            return ""; // No animation on initial load
        }
        return side === "right" ? "animate-slide-in-right" : "animate-slide-in-left";
    };

    const sideStyles = side === "right"
        ? `right-0 ${getAnimationClass()}`
        : `left-0 ${getAnimationClass()}`;

    return (
        <SheetContext.Provider value={{ onClose: () => onOpenChange(false) }}>
            {/* Backdrop - only shown in modal mode */}
            {modal && (
                <div
                    className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
                    onClick={() => onOpenChange(false)}
                />
            )}

            {/* Sheet Panel */}
            <div
                ref={sheetRef}
                className={`fixed top-0 bottom-0 ${sideStyles} z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 transition-all duration-500 ease-in-out ${expanded ? "w-full" : "w-full max-w-sm"} ${className}`}
            >
                {children}
            </div>
        </SheetContext.Provider>
    );
}

export function SheetContent({ children, className = "" }: SheetContentProps) {
    return (
        <div className={`flex-1 overflow-y-auto ${className}`}>
            {children}
        </div>
    );
}

export function SheetHeader({ children, className = "" }: SheetHeaderProps) {
    return (
        <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800 ${className}`}>
            {children}
        </div>
    );
}

export function SheetTitle({ children, className = "" }: SheetTitleProps) {
    return (
        <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
            {children}
        </h2>
    );
}

export function SheetDescription({ children, className = "" }: SheetDescriptionProps) {
    return (
        <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`}>
            {children}
        </p>
    );
}


