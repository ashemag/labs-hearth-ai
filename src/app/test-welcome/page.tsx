"use client";

import { useRouter } from "next/navigation";

export default function TestWelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-4">Test Welcome Page</h1>
        <p className="text-gray-500 mb-8">
          Preview the post-payment welcome/onboarding flow.
        </p>

        <button
          onClick={() => router.push("/welcome")}
          className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          View Welcome Page
        </button>
      </div>
    </div>
  );
}
