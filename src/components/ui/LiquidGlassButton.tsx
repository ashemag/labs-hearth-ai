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

                {/* Watercolor paper pill overlay - disappears on hover */}
                <div
                    className="absolute inset-[3px] flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200 overflow-hidden"
                    style={{ borderRadius: '9999px', backgroundColor: '#faf8f5' }}
                >
                    {/* Paper texture overlay */}
                    <div 
                        className="absolute inset-0 opacity-30 mix-blend-multiply"
                        style={{
                            backgroundImage: "url('/backgrounds/noise.png')",
                            backgroundSize: '100px 100px',
                        }}
                    />
                    <span 
                        className="relative text-xs font-medium tracking-wide"
                        style={{
                            color: '#b8b2aa',
                            textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                        }}
                    >
                        {children}
                    </span>
                </div>

                {/* Text for when hovering (on liquid metal) */}
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {children}
                </span>
            </motion.div>
        </Link>
    );
}

