"use client";

import Link from "next/link";
import HearthLogo from "@/components/HearthLogo";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-sm mx-auto px-6 text-center">
                {/* Logo with pulsing dot */}
                <div className="flex justify-center mb-8">
                    <HearthLogo />
                </div>

                <h1 className="text-2xl font-medium tracking-tight text-gray-600 mb-2">
                    Page not found
                </h1>
                <p className="text-sm text-gray-400 mb-6">
                    This page doesn&apos;t exist.
                </p>

                <Link
                    href="/"
                    className="text-sm text-gray-500 hover:text-gray-600 transition-colors"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
