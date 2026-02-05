"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface HearthLogoProps {
    size?: number;
    className?: string;
}

export default function HearthLogo({ size = 40, className = "" }: HearthLogoProps) {
    // Scale factors relative to default size of 40
    const scale = size / 40;

    return (
        <div className={`relative ${className}`}>
            <Image
                src="/brand/logo_square_new.png"
                alt="Hearth logo"
                width={size}
                height={size}
                priority
            />
            {/* Circle to cover the original orange dot */}
            <div
                className="absolute rounded-full bg-white"
                style={{
                    width: `${14 * scale}px`,
                    height: `${14 * scale}px`,
                    left: `${13 * scale}px`,
                    top: `${22 * scale}px`,
                }}
            />
            {/* Pulsing orange dot */}
            <motion.div
                className="absolute rounded-full bg-brand-orange"
                style={{
                    width: `${11 * scale}px`,
                    height: `${11 * scale}px`,
                    left: `${14.5 * scale}px`,
                    top: `${23.5 * scale}px`,
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
    );
}
