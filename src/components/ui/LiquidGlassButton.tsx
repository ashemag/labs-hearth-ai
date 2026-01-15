"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LiquidMetal } from "@paper-design/shaders-react";

interface LiquidGlassButtonProps {
    href: string;
    children: React.ReactNode;
}

export default function LiquidGlassButton({ href, children }: LiquidGlassButtonProps) {
    return (
        <Link href={href}>
            <motion.div
                className="relative cursor-pointer group overflow-hidden"
                style={{ width: '100px', height: '38px', borderRadius: '9999px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* LiquidMetal - background */}
                <LiquidMetal
                    shape="none"
                    scale={1.5}
                    rotation={0}
                    speed={1}
                    softness={0.05}
                    repetition={1.5}
                    shiftRed={0.3}
                    shiftBlue={0.3}
                    distortion={0.1}
                    contour={0.4}
                    angle={90}
                    colorTint="#FFFFFF"
                    className="bg-[#AAAAAC]"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />

                {/* White pill overlay - disappears on hover */}
                <div
                    className="absolute inset-[3px] bg-white flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200"
                    style={{ borderRadius: '9999px' }}
                >
                    <span className="text-sm font-medium text-gray-800 tracking-wide">
                        {children}
                    </span>
                </div>

                {/* Text for when hovering (on liquid metal) */}
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {children}
                </span>
            </motion.div>
        </Link>
    );
}

