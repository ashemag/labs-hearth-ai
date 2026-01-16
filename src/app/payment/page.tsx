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
import { Check, Loader2, Sparkles, Heart, Users, Brain } from "lucide-react";

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
            // Mark payment as complete in our database
            await fetch("/api/payment/complete", { method: "POST" });
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement
                options={{
                    layout: {
                        type: "accordion",
                        defaultCollapsed: false,
                        radios: true,
                        spacedAccordionItems: true,
                    },
                    paymentMethodOrder: ["link", "card"],
                    wallets: {
                        applePay: "auto",
                        googlePay: "auto",
                    },
                }}
            />

            {errorMessage && (
                <p className="text-red-600 text-sm">{errorMessage}</p>
            )}

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full py-4 bg-brand-purple-darkest text-white text-base font-medium rounded-xl hover:bg-brand-purple-darker disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                    </span>
                ) : (
                    "Become an Early Design Partner — $100"
                )}
            </button>
        </form>
    );
}

function SuccessView() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to app after 3 seconds
        const timer = setTimeout(() => {
            router.push("/");
        }, 3000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-purple to-brand-orange rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-medium text-brand-purple-darkest mb-3">
                Welcome to the family
            </h2>
            <p className="text-brand-purple mb-2">
                You&apos;re now an Early Design Partner.
            </p>
            <p className="text-brand-purple/60 text-sm mb-8">
                Lifetime access to Hearth AI. We&apos;re building this together.
            </p>
            <p className="text-sm text-brand-purple/40">
                Redirecting to your Rolodex...
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
            // Mark payment as complete
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
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-brand-purple-darkest mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-brand-purple hover:text-brand-orange underline"
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
                        fontFamily: "system-ui, sans-serif",
                        borderRadius: "12px",
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
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-lg">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Image 
                        src="/brand/logo_square_new.png" 
                        alt="Hearth" 
                        width={48} 
                        height={48}
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-medium text-brand-purple-darkest mb-3">
                        Join the Beta
                    </h1>
                    <p className="text-brand-purple text-lg">
                        Your Second Brain for Your People
                    </p>
                </div>

                {/* Value Props */}
                <div className="bg-brand-purple-lighter/30 rounded-2xl p-6 mb-8">
                    <h2 className="text-sm font-medium text-brand-purple-darkest uppercase tracking-wider mb-4">
                        Early Design Partner Benefits
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                                <Heart className="h-4 w-4 text-brand-purple" />
                            </div>
                            <div>
                                <p className="font-medium text-brand-purple-darkest">Lifetime Access</p>
                                <p className="text-sm text-brand-purple/70">All future updates and features, forever. No recurring fees.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-brand-purple" />
                            </div>
                            <div>
                                <p className="font-medium text-brand-purple-darkest">Shape the Product</p>
                                <p className="text-sm text-brand-purple/70">Direct input on features. We&apos;re building this together.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                                <Brain className="h-4 w-4 text-brand-purple" />
                            </div>
                            <div>
                                <p className="font-medium text-brand-purple-darkest">Relational Intelligence</p>
                                <p className="text-sm text-brand-purple/70">AI-powered CRM that actually understands your relationships.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-baseline gap-1">
                        <span className="text-4xl font-semibold text-brand-purple-darkest">$100</span>
                        <span className="text-brand-purple/60">one-time</span>
                    </div>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-sm text-brand-purple/50 mb-8">
                    This is an early version. Things may break. Your patience and feedback make us better.
                </p>

                {/* Payment Form */}
                <PaymentContent />

                {/* Footer */}
                <p className="text-center text-xs text-brand-purple/40 mt-8">
                    Secure payment powered by Stripe
                </p>
            </div>
        </div>
    );
}

