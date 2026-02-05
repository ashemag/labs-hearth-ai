"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-sm mx-auto px-6 text-center">
                {/* Logo with pulsing dot */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <Image
                            src="/brand/logo_square_new.png"
                            alt="Hearth"
                            width={40}
                            height={40}
                            priority
                        />
                        {/* Circle to cover the original orange dot */}
                        <div
                            className="absolute w-[14px] h-[14px] rounded-full bg-white"
                            style={{
                                left: '13px',
                                top: '22px',
                            }}
                        />
                        {/* Pulsing orange dot */}
                        <motion.div
                            className="absolute w-[11px] h-[11px] rounded-full bg-brand-orange"
                            style={{
                                left: '14.5px',
                                top: '23.5px',
                            }}
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.7, 1, 0.7],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </div>
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
