"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
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

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push("/app/rolodex");
        }, 2500);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="text-center">
            <div className="mb-6">
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
            <p className="text-xs text-gray-400">
                Redirecting...
            </p>
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
            </div>

            {/* Tagline */}
            <p className="text-center text-sm mb-6 text-gray-400">
                A new era of human tooling
            </p>

            <p className="text-center text-xs mb-6 text-gray-400">
                Early version · Your feedback makes us better
            </p>
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
                            className="absolute w-[14px] h-[14px] rounded-full bg-white"
                            style={{
                                left: '13px',
                                top: '22px',
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

                <PaymentContent />
            </div>
        </div>
    );
}
