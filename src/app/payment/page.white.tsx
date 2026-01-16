"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
            )}

            <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full h-12 bg-brand-purple-darkest hover:bg-brand-purple-darker text-white font-medium transition-all"
            >
                {isProcessing ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                    </span>
                ) : (
                    "Continue"
                )}
            </Button>
        </form>
    );
}

function SuccessView() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push("/");
        }, 2500);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="text-center">
            <div className="mb-6">
                <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
                    Welcome to Hearth
                </h2>
                <p className="mt-3 text-sm text-brand-purple">
                    You&apos;re now an Early Design Partner
                </p>
                <p className="mt-1 text-sm text-brand-purple/60">
                    Lifetime access. We&apos;re building this together.
                </p>
            </div>
            <p className="text-xs text-brand-purple/40">
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
                <Loader2 className="h-5 w-5 animate-spin text-brand-purple/40" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center">
                <p className="text-brand-purple-darkest mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-brand-purple hover:text-brand-orange transition-colors"
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
                        colorBackground: "#ffffff",
                        colorText: "#4a3f5c",
                        colorTextSecondary: "#8b7f99",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        borderRadius: "8px",
                        spacingUnit: "4px",
                    },
                    rules: {
                        '.Input': {
                            backgroundColor: 'rgba(139, 127, 153, 0.08)',
                            border: 'none',
                            boxShadow: 'none',
                        },
                        '.Input:focus': {
                            backgroundColor: '#ffffff',
                            boxShadow: '0 0 0 2px rgba(232, 121, 59, 0.2)',
                        },
                        '.Tab': {
                            border: 'none',
                            backgroundColor: 'rgba(139, 127, 153, 0.08)',
                        },
                        '.Tab--selected': {
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
        <div className="min-h-screen flex items-center justify-center bg-white py-12">
            <div className="w-full max-w-sm mx-auto px-6">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Image
                        src="/brand/logo_square_new.png"
                        alt="Hearth"
                        width={36}
                        height={36}
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
                        Early Design Partner
                    </h2>
                    <p className="mt-3 text-lg font-medium text-brand-purple-darkest">
                        $100
                    </p>
                    <p className="mt-1 text-sm text-brand-purple/60">
                        Once, forever
                    </p>
                </div>

                {/* Tagline */}
                <p className="text-center text-sm text-brand-purple/50 mb-6">
                    A new moment deserves a new tool
                </p>

                <p className="text-center text-xs text-brand-purple/40 mb-6">
                    Early version · Your feedback makes us better
                </p>

                {/* Payment Form */}
                <PaymentContent />

                {/* Footer */}
                <p className="text-center text-xs text-brand-purple/30 mt-6">
                    Secure payment via Stripe
                </p>
            </div>
        </div>
    );
}

