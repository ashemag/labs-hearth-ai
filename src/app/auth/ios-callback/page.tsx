"use client";

import { useEffect, useState } from "react";

export default function IOSCallbackPage() {
    const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [iosUrl, setIosUrl] = useState<string | null>(null);

    useEffect(() => {
        const hash = window.location.hash.substring(1);

        if (!hash) {
            setStatus("error");
            setError("No authentication data found. Please try signing in again.");
            return;
        }

        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken) {
            setStatus("error");
            setError("Authentication failed. Please try signing in again.");
            return;
        }

        setStatus("redirecting");

        const nextUrl = `hearth-simple://callback#access_token=${accessToken}&refresh_token=${refreshToken || ""}`;
        setIosUrl(nextUrl);
        window.location.href = nextUrl;

        setTimeout(() => {
            setStatus("error");
            setError("Could not open the Hearth Simple app automatically. Please make sure the app is installed and try again.");
        }, 3000);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg text-center">
                {status === "loading" && (
                    <>
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-semibold text-gray-900 mb-2">
                            Signing you in...
                        </h1>
                        <p className="text-gray-500">Please wait</p>
                    </>
                )}

                {status === "redirecting" && (
                    <>
                        <div className="text-4xl mb-4">📱</div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-2">
                            Opening Hearth Simple...
                        </h1>
                        <p className="text-gray-500">
                            You should be redirected to the app automatically.
                        </p>
                        {iosUrl && (
                            <a
                                href={iosUrl}
                                className="inline-block mt-4 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                            >
                                Open Hearth Simple
                            </a>
                        )}
                        <p className="text-sm text-gray-400 mt-4">
                            If nothing happens, make sure the Hearth Simple app is installed.
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="text-4xl mb-4">😕</div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-500 mb-4">{error}</p>
                        {iosUrl && (
                            <a
                                href={iosUrl}
                                className="inline-block mb-3 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                            >
                                Open Hearth Simple
                            </a>
                        )}
                        <a
                            href="/"
                            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                            Go to Hearth
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}
