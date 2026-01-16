"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

function SlackErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "unknown";

  const errorMessages: Record<string, string> = {
    access_denied: "You cancelled the authorization.",
    missing_code: "Authorization code was missing.",
    api_error: "There was an error communicating with Slack.",
    storage_failed: "Failed to save your connection.",
    storage_exception: "An unexpected error occurred while saving.",
    exception: "An unexpected error occurred.",
    unknown: "Something went wrong.",
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

        <div className="text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
              Connection failed
            </h2>
            <p className="mt-3 text-sm text-brand-purple">
              {errorMessages[reason] || errorMessages.unknown}
            </p>
            <p className="mt-1 text-sm text-brand-purple/60">
              Please try again.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/api/slack/connect">
              <Button className="w-full h-12 bg-brand-purple-darkest hover:bg-brand-purple-darker text-white font-medium transition-all">
                Try again
              </Button>
            </Link>
            <Link 
              href="/"
              className="block text-sm text-brand-purple hover:text-brand-orange transition-colors"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SlackError() {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="w-full max-w-sm mx-auto px-6 text-center">
          <p className="text-sm text-brand-purple">Loading...</p>
        </div>
      </div>
    }>
      <SlackErrorContent />
    </Suspense>
  );
}
