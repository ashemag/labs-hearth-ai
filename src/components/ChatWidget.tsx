"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Settings } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface ChatWidgetProps {
    sidePanelOpen?: boolean;
}

export default function ChatWidget({ sidePanelOpen = false }: ChatWidgetProps) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput("");
        setError(null);

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.reply,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch {
            setError("Failed to connect. Check your network.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className={`fixed bottom-6 z-40 w-14 h-14 bg-white dark:bg-gray-900 rounded-full shadow-lg shadow-gray-300/60 dark:shadow-black/40 hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center ${
                        sidePanelOpen ? "right-[26rem]" : "right-6"
                    }`}
                    title="Chat with your data"
                >
                    <Image
                        src="/brand/logo_square_new.png"
                        alt="Hearth"
                        width={32}
                        height={32}
                        className="object-contain"
                    />
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div className={`fixed bottom-6 z-40 w-96 h-[32rem] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-gray-300/50 dark:shadow-black/50 border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 ${
                    sidePanelOpen ? "right-[26rem]" : "right-6"
                }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/brand/logo_square_new.png"
                                alt="Hearth"
                                width={24}
                                height={24}
                                className="object-contain"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Hearth
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    setMessages([]);
                                    setError(null);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-xs"
                                title="Clear chat"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                                        msg.role === "user"
                                            ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 whitespace-pre-wrap"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 prose prose-sm prose-gray dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                    }`}
                                >
                                    {msg.role === "user" ? (
                                        msg.content
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                                a: ({ href, children }) => <a href={href} className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2.5 rounded-xl flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-2">
                                <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
                                {error.includes("Settings") && (
                                    <Link
                                        href="/app/settings"
                                        className="inline-flex items-center gap-1 mt-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                                    >
                                        <Settings className="h-3 w-3" />
                                        Go to Settings
                                    </Link>
                                )}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Ask about your contacts..."
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || loading}
                                className="p-2 text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 disabled:hover:bg-gray-800 dark:disabled:hover:bg-gray-200 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
