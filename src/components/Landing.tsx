"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import AuthHandler from "@/components/AuthHandler";

export default function Landing() {
  return (
    <div className="relative w-screen min-h-screen flex flex-col items-center justify-center bg-watercolor-paper">
      {/* Handle auth redirects from magic links */}
      <AuthHandler />

      {/* Sign In Button - Top Right */}
      <div className="absolute top-6 right-8 z-10">
        <LiquidGlassButton href="https://labs.hearth.ai/sign-in">
          Sign In
        </LiquidGlassButton>
      </div>

      {/* Logo with pulsing animation */}
      <div className="relative z-10">
        <Image
          src="/brand/logo_square_new.png"
          alt="Hearth Logo"
          width={40}
          height={40}
          priority
        />
        {/* Circle to cover the original orange dot - matches watercolor paper */}
        <div
          className="absolute w-[14px] h-[14px] rounded-full"
          style={{
            left: '13px',
            top: '22px',
            backgroundColor: '#faf8f5',
          }}
        />
        {/* Pulsing orange dot on top */}
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
  );
}

