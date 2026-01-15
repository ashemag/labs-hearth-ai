"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

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
    <div className="h-full w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image 
            src="/brand/logo_square_new.png" 
            alt="Hearth" 
            width={36} 
            height={36}
          />
        </div>

        {view === "sent" && (
          // Magic link sent
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
                Check your email
              </h2>
              <p className="mt-3 text-sm text-brand-purple">
                We sent a magic link to <span className="font-medium">{email}</span>
              </p>
              <p className="mt-1 text-sm text-brand-purple/60">
                Click the link to sign in
              </p>
            </div>
            <button
              onClick={resetForm}
              className="text-sm text-brand-purple hover:text-brand-orange transition-colors"
            >
              Use a different email
            </button>
          </div>
        )}

        {view === "not-allowed" && (
          // Not on allowlist
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
                Not on the list yet
              </h2>
              <p className="mt-3 text-sm text-brand-purple">
                <span className="font-medium">{email}</span> isn&apos;t on our private beta list.
              </p>
              <p className="mt-1 text-sm text-brand-purple/60">
                Want to join the waitlist?
              </p>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              <Button
                onClick={handleJoinWaitlist}
                disabled={loading}
                className="w-full h-12 bg-brand-purple-darkest hover:bg-brand-purple-darker text-white font-medium transition-all"
              >
                {loading ? "Joining..." : "Join waitlist"}
              </Button>
              <button
                onClick={resetForm}
                className="text-sm text-brand-purple hover:text-brand-orange transition-colors"
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
              <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
                Chat soon
              </h2>
              <p className="mt-3 text-sm text-brand-purple">
                We&apos;ll notify <span className="font-medium">{email}</span> when you get access.
              </p>
              <p className="mt-1 text-sm text-brand-purple/60">
                Thanks for your interest in Hearth
              </p>
            </div>
            <button
              onClick={resetForm}
              className="text-sm text-brand-purple hover:text-brand-orange transition-colors"
            >
              Back to sign in
            </button>
          </div>
        )}

        {view === "form" && (
          // Initial form
          <>
            <div className="mb-10">
              <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-brand-purple">
                Private beta — invite only
              </p>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-xs uppercase tracking-wider text-brand-purple font-medium"
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
                  className="h-12 bg-brand-purple-lighter/30 border-0 focus:bg-white focus:ring-2 focus:ring-brand-orange/20 transition-all placeholder:text-brand-purple/40"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brand-purple-darkest hover:bg-brand-purple-darker text-white font-medium transition-all"
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
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
