"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HearthLogo from "@/components/HearthLogo";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { LiquidMetal } from "@paper-design/shaders-react";

const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment?success=true`,
            },
            redirect: "if_required",
        });

        if (error) {
            setErrorMessage(error.message || "An unexpected error occurred.");
            setIsProcessing(false);
        } else {
            await fetch("/api/payment/complete", { method: "POST" });
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <PaymentElement
                options={{
                    layout: "tabs",
                    paymentMethodOrder: ["card", "link"],
                    wallets: {
                        applePay: "auto",
                        googlePay: "auto",
                    },
                }}
            />

            {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50/80 border border-red-200/50">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="group w-full h-12 relative z-10 rounded-lg overflow-hidden disabled:opacity-50 transition-all cursor-pointer"
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
                    className="absolute inset-[3px] flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200 overflow-hidden rounded-md bg-white"
                >
                    <span className="relative flex items-center justify-center h-full font-medium text-gray-500">
                        {isProcessing ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            "Continue"
                        )}
                    </span>
                </div>

                {/* Text for when hovering (on liquid metal) */}
                <span className="absolute inset-0 flex items-center justify-center font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isProcessing ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                        </span>
                    ) : (
                        "Continue"
                    )}
                </span>
            </button>
        </form>
    );
}

function SuccessView() {
    const router = useRouter();

    // Redirects to the latest universal DMG from GitHub Releases
    const DOWNLOAD_URL = '/api/download/mac';

    return (
        <div className="text-center">
            <div className="mb-8">
                <h2 className="text-2xl font-medium tracking-tight text-gray-600">
                    Welcome to Hearth
                </h2>
                <p className="mt-3 text-sm text-gray-500">
                    You&apos;re now an Early Design Partner
                </p>
                <p className="mt-1 text-sm text-gray-400">
                    Lifetime access. We&apos;re building this together.
                </p>
            </div>

            {/* Download Button */}
            <div className="mb-6">
                <p className="text-sm text-gray-500 mb-4">
                    Download the iMessage Sync app
                </p>
                <a
                    href={DOWNLOAD_URL}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download for Mac
                </a>
                <p className="text-xs text-gray-400 mt-2">
                    Works on all Macs (Apple Silicon &amp; Intel)
                </p>
            </div>

            {/* Installation Note */}
            <div className="text-xs text-gray-400 mb-6 max-w-[280px] mx-auto">
                <p className="mb-2">After downloading:</p>
                <p>Right-click the app and select Open (first time only)</p>
            </div>

            {/* Continue to Dashboard */}
            <button
                onClick={() => router.push('/app/rolodex')}
                className="text-sm text-gray-500 hover:text-gray-600 transition-colors cursor-pointer underline underline-offset-2"
            >
                Continue to Dashboard
            </button>
        </div>
    );
}

function PaymentContent() {
    const router = useRouter();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("success") === "true") {
            fetch("/api/payment/complete", { method: "POST" })
                .then(() => {
                    setPaymentSuccess(true);
                    setLoading(false);
                });
            return;
        }

        fetch("/api/payment/create-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.alreadyPaid) {
                    router.push("/");
                    return;
                }
                if (data.error) {
                    setError(data.error);
                } else {
                    setClientSecret(data.clientSecret);
                }
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to initialize payment.");
                setLoading(false);
            });
    }, [router]);

    if (loading) {
        return (
            <>
                <PaymentHeader />
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <PaymentHeader />
                <div className="text-center">
                    <p className="mb-4 text-gray-500">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-gray-500 transition-colors hover:opacity-70 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            </>
        );
    }

    if (paymentSuccess) {
        return <SuccessView />;
    }

    if (!clientSecret) {
        return null;
    }

    return (
        <>
            <PaymentHeader />
            <Elements
                stripe={stripePromise}
                options={{
                    clientSecret,
                    appearance: {
                        theme: "stripe",
                        variables: {
                            colorPrimary: "#6b7280",
                            colorBackground: "#ffffff",
                            colorText: "#6b7280",
                            colorTextSecondary: "#9ca3af",
                            fontFamily: "system-ui, -apple-system, sans-serif",
                            borderRadius: "8px",
                            spacingUnit: "4px",
                        },
                        rules: {
                            '.Input': {
                                backgroundColor: '#ffffff',
                                border: '1px solid rgba(156, 163, 175, 0.3)',
                                boxShadow: 'none',
                            },
                            '.Input:focus': {
                                backgroundColor: '#ffffff',
                                border: '1px solid rgba(156, 163, 175, 0.5)',
                                boxShadow: '0 0 0 2px rgba(156, 163, 175, 0.1)',
                            },
                            '.Tab': {
                                border: '1px solid rgba(156, 163, 175, 0.3)',
                                backgroundColor: '#ffffff',
                            },
                            '.Tab--selected': {
                                backgroundColor: '#ffffff',
                                border: '1px solid rgba(156, 163, 175, 0.5)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            },
                            '.Label': {
                                color: '#6b7280',
                            },
                        },
                    },
                }}
            >
                <CheckoutForm onSuccess={() => setPaymentSuccess(true)} />
            </Elements>
            <PaymentFooter />
        </>
    );
}

function PaymentHeader() {
    return (
        <>
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-medium tracking-tight text-gray-600">
                    Early Design Partner
                </h2>
                <p className="mt-3 text-lg font-medium text-gray-600">
                    $100
                </p>
                <p className="mt-1 text-sm text-gray-400">
                    Once, forever
                </p>
                <p className="mt-3 text-xs text-gray-400 max-w-[280px] mx-auto">
                    As the product grows, you&apos;re grandfathered in.
                    <br />
                    Welcome to the team.
                </p>
            </div>
        </>
    );
}

function PaymentFooter() {
    return (
        <p className="text-center text-xs mt-6 text-gray-400">
            Questions?{' '}
            <a
                href="mailto:ashe@hearth.ai"
                className="text-gray-500 underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
                Contact us
            </a>
        </p>
    );
}

export default function PaymentPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white py-12 relative">
            {/* Sign out option - top right */}
            <button
                onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/sign-in";
                }}
                className="absolute top-4 right-4 sm:top-6 sm:right-8 text-xs text-gray-400 hover:text-gray-500 transition-colors cursor-pointer"
            >
                Use a different email
            </button>

            <div className="w-full max-w-sm mx-auto px-6 relative z-10">
                {/* Logo with pulsing dot */}
                <div className="flex justify-center mb-8">
                    <HearthLogo />
                </div>

                <PaymentContent />
            </div>
        </div>
    );
}
