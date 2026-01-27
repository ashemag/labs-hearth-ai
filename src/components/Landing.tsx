"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import AuthHandler from "@/components/AuthHandler";

export default function Landing() {
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Auto sign-in for localhost
      setSigningIn(true);
      try {
        const response = await fetch('/api/auth/dev-login', { method: 'POST' });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        window.location.href = '/sign-in';
      }
    } else {
      window.location.href = '/sign-in';
    }
  };

  return (
    <div className="relative w-screen min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Handle auth redirects from magic links */}
      <AuthHandler />

      {/* Sign In Button - Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-10">
        <LiquidGlassButton onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? "Kindling..." : "Play with Fire"}
        </LiquidGlassButton>
      </div>

      {/* Logo with pulsing animation */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative">
          <Image
            src="/brand/logo_square_new.png"
            alt="Hearth Logo"
            width={40}
            height={40}
            priority
          />
          {/* Circle to cover the original orange dot - matches white background */}
          <div
            className="absolute w-[14px] h-[14px] rounded-full bg-white"
            style={{
              left: '13px',
              top: '22px',
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
        <span
          className="mt-3 text-xs tracking-wide etched-text"
          style={{
            color: '#9ca3af',
            textShadow: '0 1px 1px rgba(255, 255, 255, 0.9), 0 -1px 1px rgba(0, 0, 0, 0.1)',
          }}
        >
          Relational Intelligence
        </span>
        <span
          className="mt-1 text-xs tracking-wide etched-text"
          style={{
            color: '#9ca3af',
            textShadow: '0 1px 1px rgba(255, 255, 255, 0.9), 0 -1px 1px rgba(0, 0, 0, 0.1)',
          }}
        >
          Your Second Brain for Your People
        </span>
      </div>
    </div>
  );
}

