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
                <h2
                    className="text-2xl font-medium tracking-tight"
                    style={{ color: '#4a3f5c' }}
                >
                    Welcome to Hearth
                </h2>
                <p
                    className="mt-3 text-sm"
                    style={{ color: '#5c564e' }}
                >
                    You&apos;re now an Early Design Partner
                </p>
                <p
                    className="mt-1 text-sm"
                    style={{ color: '#b8b2aa' }}
                >
                    Lifetime access. We&apos;re building this together.
                </p>
            </div>
            <p
                className="text-xs"
                style={{ color: '#b8b2aa' }}
            >
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
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#b8b2aa' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center">
                <p className="mb-4" style={{ color: '#4a3f5c' }}>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm transition-colors hover:opacity-70 cursor-pointer"
                    style={{ color: '#5c564e' }}
                >
                    Try again
                </button>
            </div>
        );
    }

    if (paymentSuccess) {
        return <SuccessView />;
    }

    if (!clientSecret) {
        return null;
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{
                clientSecret,
                appearance: {
                    theme: "stripe",
                    variables: {
                        colorPrimary: "#4a3f5c",
                        colorBackground: "#faf8f5",
                        colorText: "#4a3f5c",
                        colorTextSecondary: "#5c564e",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        borderRadius: "8px",
                        spacingUnit: "4px",
                    },
                    rules: {
                        '.Input': {
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            border: '1px solid rgba(184, 178, 170, 0.3)',
                            boxShadow: 'none',
                        },
                        '.Input:focus': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid rgba(232, 121, 59, 0.4)',
                            boxShadow: '0 0 0 2px rgba(232, 121, 59, 0.1)',
                        },
                        '.Tab': {
                            border: '1px solid rgba(184, 178, 170, 0.3)',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '.Tab--selected': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid rgba(184, 178, 170, 0.4)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        },
                        '.Label': {
                            color: '#5c564e',
                        },
                    },
                },
            }}
        >
            <CheckoutForm onSuccess={() => setPaymentSuccess(true)} />
        </Elements>
    );
}

export default function PaymentPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-watercolor-paper py-12">
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

                {/* Header */}
                <div className="text-center mb-6">
                    <h2
                        className="text-2xl font-medium tracking-tight"
                        style={{
                            color: '#5c564e',
                            textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                        }}
                    >
                        Early Design Partner
                    </h2>
                    <p
                        className="mt-3 text-lg font-medium"
                        style={{
                            color: '#5c564e',
                            textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                        }}
                    >
                        $100
                    </p>
                    <p
                        className="mt-1 text-sm"
                        style={{
                            color: '#b8b2aa',
                            textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                        }}
                    >
                        Once, forever
                    </p>
                </div>

                {/* Tagline */}
                <p
                    className="text-center text-sm mb-6"
                    style={{
                        color: '#b8b2aa',
                        textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                    }}
                >
                    A new era of human tooling
                </p>

                <p
                    className="text-center text-xs mb-6"
                    style={{
                        color: '#c5c0b8',
                        textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                    }}
                >
                    Early version · Your feedback makes us better
                </p>

                {/* Payment Form */}
                <PaymentContent />

                {/* Footer */}
                <p
                    className="text-center text-xs mt-6"
                    style={{
                        color: '#c5c0b8',
                        textShadow: '1px 1px 0px rgba(255, 255, 255, 0.7)',
                    }}
                >
                    Questions?{' '}
                    <a
                        href="mailto:ashe@hearth.ai"
                        className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                        style={{ color: '#5c564e' }}
                    >
                        Contact us
                    </a>
                </p>
            </div>
        </div>
    );
}
