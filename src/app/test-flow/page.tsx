"use client";

import { useState } from "react";

export default function TestFlowPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTestFlow = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/test-user", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create test user");
        setLoading(false);
        return;
      }

      // Redirect directly to the magic link to sign in
      window.location.href = data.testUser.magicLink;
    } catch (err) {
      setError("Network error");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-4">Test New User Flow</h1>

        <p className="text-gray-500 mb-8">
          This will create a test account and sign you in automatically.
          You&apos;ll go through the payment page like a new user would.
        </p>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={startTestFlow}
          disabled={loading}
          className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mb-8"
        >
          {loading ? "Starting..." : "Start Test Flow"}
        </button>

        <div className="text-left bg-gray-50 rounded-lg p-6">
          <h2 className="font-medium text-gray-700 mb-3">Test Card Details</h2>
          <div className="space-y-2 text-sm font-mono">
            <p><span className="text-gray-500">Number:</span> <span className="text-gray-900">4242 4242 4242 4242</span></p>
            <p><span className="text-gray-500">Expiry:</span> <span className="text-gray-900">12/34</span></p>
            <p><span className="text-gray-500">CVC:</span> <span className="text-gray-900">123</span></p>
            <p><span className="text-gray-500">ZIP:</span> <span className="text-gray-900">12345</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
