"use client";

import { Player } from "@remotion/player";
import { ArrowRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HearthLogo from "@/components/HearthLogo";
import { createClient } from "@/lib/supabase/client";
import {
    ModernRolodexVideo,
    ONBOARDING_VIDEO_DURATION,
} from "@/features/onboarding/ModernRolodexVideo";

export default function OnboardingPage() {
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/sign-in");
        router.refresh();
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#fdfcfb] text-brand-purple">
            {/* Ambient brand washes */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-48 left-1/2 h-[520px] w-[880px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(167,113,95,0.07),transparent)]" />
                <div className="absolute -bottom-56 right-[-180px] h-[520px] w-[680px] rounded-full bg-[radial-gradient(closest-side,rgba(131,133,166,0.09),transparent)]" />
                <div className="absolute -bottom-40 left-[-220px] h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(167,113,95,0.05),transparent)]" />
            </div>

            <button
                onClick={handleSignOut}
                className="absolute right-4 top-4 z-20 inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs text-brand-purple-light transition-colors hover:bg-brand-purple-lighter/40 hover:text-brand-purple sm:right-8 sm:top-6"
            >
                <LogOut className="h-3.5 w-3.5" />
                Use a different email
            </button>

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-16 sm:px-8">
                <div className="mb-10 flex flex-col items-center gap-3">
                    <HearthLogo size={36} />
                    <span className="text-[11px] uppercase tracking-[0.28em] text-brand-purple-light">
                        Welcome to Hearth
                    </span>
                </div>

                <section className="mx-auto flex w-full max-w-4xl flex-col items-center">
                    {/* Video */}
                    <div className="relative w-full">
                        <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(closest-side,rgba(167,113,95,0.06),transparent)]" />
                        <div className="relative overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_40px_120px_-28px_rgba(75,78,108,0.38)] ring-1 ring-brand-purple-lighter">
                            <div className="overflow-hidden rounded-[10px]">
                                <Player
                                    component={ModernRolodexVideo}
                                    durationInFrames={ONBOARDING_VIDEO_DURATION}
                                    compositionWidth={1280}
                                    compositionHeight={720}
                                    fps={30}
                                    autoPlay
                                    loop
                                    muted
                                    clickToPlay={false}
                                    acknowledgeRemotionLicense
                                    style={{
                                        width: "100%",
                                        aspectRatio: "16 / 9",
                                        display: "block",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/payment"
                        className="group mt-10 inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-brand-purple-darkest text-sm font-medium text-white shadow-[0_18px_40px_-16px_rgba(30,31,43,0.55)] transition-all hover:-translate-y-0.5 hover:bg-brand-purple-darker hover:shadow-[0_22px_48px_-16px_rgba(30,31,43,0.6)]"
                    >
                        Continue
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </section>
            </div>
        </main>
    );
}
