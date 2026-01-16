"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { motion } from "framer-motion";
import { LiquidMetal } from "@paper-design/shaders-react";
import AuthHandler from "@/components/AuthHandler";

type ViewState = "form" | "sent" | "not-allowed" | "waitlist-joined";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewState>("form");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Get email from input ref (more reliable with some browser automation)
    const emailValue = emailInputRef.current?.value || email;

    // Update state with ref value for display purposes
    if (emailValue && !email) {
      setEmail(emailValue);
    }

    // Send magic link via our custom API (uses Resend)
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailValue }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error === 'not_allowed') {
        setLoading(false);
        setView("not-allowed");
        return;
      }
      setError(data.error || 'Something went wrong');
      setLoading(false);
      return;
    }

    setView("sent");
    setLoading(false);
  };

  const handleJoinWaitlist = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if already on waitlist
      const { data: existing } = await supabase
        .from("waitlist")
        .select("email")
        .eq("email", email.toLowerCase())
        .single();

      if (existing) {
        setView("waitlist-joined");
        setLoading(false);
        return;
      }

      // Add to waitlist
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.toLowerCase() });

      if (error) {
        console.error("Waitlist error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setView("waitlist-joined");
      setLoading(false);
    } catch (err) {
      console.error("Waitlist catch error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setView("form");
    setEmail("");
    setError(null);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-watercolor-paper">
      {/* Handle auth redirects from magic links */}
      <AuthHandler />
      
      <div className="w-full max-w-sm mx-auto px-6 relative z-10">
        {/* Logo with pulsing dot */}
        <div className="flex justify-center mb-10">
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
              className="absolute w-[14px] h-[14px] rounded-full"
              style={{
                left: '13px',
                top: '22px',
                backgroundColor: '#faf8f5',
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

        {view === "sent" && (
          // Magic link sent
          <div className="text-center">
            <div className="mb-6">
              <h2
                className="text-2xl font-medium tracking-tight"
                style={{
                  color: '#5c564e',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Check your email
              </h2>
              <p
                className="mt-3 text-sm"
                style={{
                  color: '#8b7f99',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                We sent a magic link to <span className="font-medium">{email}</span>
              </p>
              <p
                className="mt-1 text-sm"
                style={{
                  color: '#b8b2aa',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Click the link to sign in
              </p>
            </div>
            <button
              onClick={resetForm}
              className="text-sm transition-colors hover:opacity-70 cursor-pointer"
              style={{ color: '#8b7f99' }}
            >
              Use a different email
            </button>
          </div>
        )}

        {view === "not-allowed" && (
          // Not on allowlist
          <div className="text-center">
            <div className="mb-6">
              <h2
                className="text-2xl font-medium tracking-tight"
                style={{
                  color: '#5c564e',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Not on the list yet
              </h2>
              <p
                className="mt-3 text-sm"
                style={{
                  color: '#8b7f99',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                <span className="font-medium">{email}</span> isn&apos;t on our private beta list.
              </p>
              <p
                className="mt-1 text-sm"
                style={{
                  color: '#b8b2aa',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Want to join the waitlist?
              </p>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50/80 border border-red-200/50 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleJoinWaitlist}
                disabled={loading}
                className="group w-full h-12 relative rounded-lg overflow-hidden disabled:opacity-50 transition-all cursor-pointer"
              >
                {/* LiquidMetal - always visible as metallic border/background */}
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
                  className="absolute inset-0 w-full h-full bg-[#AAAAAC]"
                />

                {/* Inner overlay - creates metallic border effect, fades on hover */}
                <div
                  className="absolute inset-[3px] flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200 overflow-hidden rounded-md"
                  style={{ backgroundColor: '#faf8f5' }}
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
                    className="relative flex items-center justify-center h-full font-medium"
                    style={{
                      color: '#5c564e',
                      textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {loading ? "Joining..." : "Join waitlist"}
                  </span>
                </div>

                {/* Text for when hovering (on liquid metal) */}
                <span className="absolute inset-0 flex items-center justify-center font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {loading ? "Joining..." : "Join waitlist"}
                </span>
              </button>
              <button
                onClick={resetForm}
                className="text-sm transition-colors hover:opacity-70 cursor-pointer"
                style={{ color: '#8b7f99' }}
              >
                Try a different email
              </button>
            </div>
          </div>
        )}

        {view === "waitlist-joined" && (
          // Successfully joined waitlist
          <div className="text-center">
            <div className="mb-6">
              <h2
                className="text-2xl font-medium tracking-tight"
                style={{
                  color: '#5c564e',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Chat soon
              </h2>
              <p
                className="mt-3 text-sm"
                style={{
                  color: '#8b7f99',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                We&apos;ll notify <span className="font-medium">{email}</span> when you get access.
              </p>
              <p
                className="mt-1 text-sm"
                style={{
                  color: '#b8b2aa',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Thanks for your interest in Hearth
              </p>
            </div>
            <button
              onClick={resetForm}
              className="text-sm transition-colors hover:opacity-70 cursor-pointer"
              style={{ color: '#8b7f99' }}
            >
              Back to sign in
            </button>
          </div>
        )}

        {view === "form" && (
          // Initial form
          <>
            <div className="text-center mb-8">
              <h2
                className="text-2xl font-medium tracking-tight"
                style={{
                  color: '#5c564e',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Sign in
              </h2>
              <p
                className="mt-2 text-sm"
                style={{
                  color: '#b8b2aa',
                  textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                }}
              >
                Play with Fire
              </p>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: '#8b7f99' }}
                >
                  Email
                </Label>
                <Input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  defaultValue=""
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-12 border transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    borderColor: 'rgba(184, 178, 170, 0.3)',
                  }}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50/80 border border-red-200/50">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full h-12 relative rounded-lg overflow-hidden disabled:opacity-50 transition-all cursor-pointer"
              >
                {/* LiquidMetal - always visible as metallic border/background */}
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
                  className="absolute inset-0 w-full h-full bg-[#AAAAAC]"
                />

                {/* Inner overlay - creates metallic border effect, fades on hover */}
                <div
                  className="absolute inset-[3px] flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200 overflow-hidden rounded-md"
                  style={{ backgroundColor: '#faf8f5' }}
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
                    className="relative flex items-center justify-center h-full font-medium"
                    style={{
                      color: '#5c564e',
                      textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Checking...
                      </span>
                    ) : (
                      "Continue"
                    )}
                  </span>
                </div>

                {/* Text for when hovering (on liquid metal) */}
                <span className="absolute inset-0 flex items-center justify-center font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Checking...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
