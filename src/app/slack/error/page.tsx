"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SlackErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "unknown";

  const errorMessages: Record<string, string> = {
    access_denied: "You cancelled the authorization. No worries, you can try again anytime.",
    missing_code: "Authorization code was missing. Please try connecting again.",
    api_error: "There was an error communicating with Slack. Please try again.",
    storage_failed: "Failed to save your connection. Please try again.",
    storage_exception: "An unexpected error occurred while saving. Please try again.",
    exception: "An unexpected error occurred. Please try again.",
    unknown: "Something went wrong. Please try again.",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connection Failed
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {errorMessages[reason] || errorMessages.unknown}
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SlackError() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <SlackErrorContent />
    </Suspense>
  );
}

