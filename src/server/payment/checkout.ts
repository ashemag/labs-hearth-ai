import Stripe from "stripe";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, serverError, type ServerSupabaseClient } from "@/server/api/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const designPartnerAmountCents = 10000;
const firstHundredLimit = 100;

interface SignupOrderInfo {
    signupOrder: number | null;
    totalUsers: number;
}

function promoSecret() {
    const secret = process.env.FIRST_100_PROMO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
        throw new Error("Missing FIRST_100_PROMO_SECRET or SUPABASE_SERVICE_ROLE_KEY");
    }

    return secret;
}

function normalizePromoCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, "");
}

function generateFirstHundredPromoCode(userId: string, signupOrder: number) {
    const digest = createHmac("sha256", promoSecret())
        .update(`${userId}:${signupOrder}:first-100`)
        .digest("hex")
        .slice(0, 8)
        .toUpperCase();

    return `HEARTH-${String(signupOrder).padStart(3, "0")}-${digest}`;
}

async function getSignupOrderInfo(userId: string): Promise<SignupOrderInfo> {
    const admin = createAdminClient();
    const profiles: Array<{ id: string; created_at: string }> = [];
    const perPage = 1000;
    let from = 0;
    let hasMoreProfiles = true;

    while (hasMoreProfiles) {
        const { data, error } = await admin
            .from("user_profiles")
            .select("id, created_at")
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, from + perPage - 1);

        if (error) {
            console.error("Error loading profile signup order:", error);
            serverError("Failed to load signup order");
        }

        profiles.push(...(data || []));

        hasMoreProfiles = (data || []).length === perPage;
        from += perPage;
    }

    const index = profiles.findIndex((profile) => profile.id === userId);
    const signupOrder = index === -1 ? profiles.length + 1 : index + 1;

    return {
        signupOrder,
        totalUsers: Math.max(profiles.length, signupOrder),
    };
}

export async function getFirstHundredPromoStatus(userId: string) {
    const { signupOrder, totalUsers } = await getSignupOrderInfo(userId);
    const eligible = signupOrder !== null && signupOrder <= firstHundredLimit;

    return {
        signupOrder,
        totalUsers,
        eligible,
        limit: firstHundredLimit,
        code: eligible && signupOrder ? generateFirstHundredPromoCode(userId, signupOrder) : null,
    };
}

export async function redeemFirstHundredPromo(
    supabase: ServerSupabaseClient,
    user: { id: string; email?: string },
    code: string
) {
    const { data: existingPayment } = await supabase
        .from("user_payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .maybeSingle();

    if (existingPayment) {
        return { success: true, alreadyPaid: true };
    }

    const promoStatus = await getFirstHundredPromoStatus(user.id);

    if (!promoStatus.eligible || !promoStatus.code) {
        throw new ApiError("This promo is only available to the first 100 signups.", 403);
    }

    if (normalizePromoCode(code) !== promoStatus.code) {
        throw new ApiError("Invalid promo code", 400);
    }

    const admin = createAdminClient();
    const { error } = await admin.from("user_payments").insert({
        user_id: user.id,
        email: user.email || "",
        stripe_payment_intent_id: `promo:first-100:${user.id}`,
        amount_cents: 0,
        status: "completed",
        paid_at: new Date().toISOString(),
    });

    if (error) {
        if (error.code === "23505") {
            return { success: true, alreadyPaid: true };
        }

        console.error("Error redeeming first hundred promo:", error);
        serverError("Failed to redeem promo code");
    }

    return {
        success: true,
        alreadyPaid: false,
        signupOrder: promoStatus.signupOrder,
    };
}

export async function createDesignPartnerPaymentIntent(
    supabase: ServerSupabaseClient,
    user: { id: string; email?: string }
) {
    const { data: existingPayment } = await supabase
        .from("user_payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .single();

    if (existingPayment) {
        throw new ApiError("Already paid", 400, {
            error: "Already paid",
            alreadyPaid: true,
        });
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: designPartnerAmountCents,
        currency: "usd",
        automatic_payment_methods: {
            enabled: true,
        },
        metadata: {
            user_id: user.id,
            email: user.email || "",
            product: "Hearth AI Beta - Early Design Partner",
        },
    });

    const admin = createAdminClient();
    const { error } = await admin.from("user_payments").insert({
        user_id: user.id,
        email: user.email || "",
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: designPartnerAmountCents,
        status: "pending",
    });

    if (error) {
        console.error("Error storing pending payment:", error);
        serverError("Failed to store payment");
    }

    return {
        clientSecret: paymentIntent.client_secret,
    };
}

export async function completeDesignPartnerPayment(
    supabase: ServerSupabaseClient,
    userId: string
) {
    const { data: pendingPayment, error: pendingPaymentError } = await supabase
        .from("user_payments")
        .select("id, stripe_payment_intent_id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (pendingPaymentError) {
        console.error("Error loading pending payment:", pendingPaymentError);
        serverError("Failed to load payment");
    }

    if (!pendingPayment?.stripe_payment_intent_id) {
        throw new ApiError("No pending payment found", 400);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
        pendingPayment.stripe_payment_intent_id
    );

    if (
        paymentIntent.status !== "succeeded" ||
        paymentIntent.metadata.user_id !== userId
    ) {
        throw new ApiError("Payment not completed", 400);
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("user_payments")
        .update({
            status: "completed",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", pendingPayment.id)
        .eq("user_id", userId)
        .eq("status", "pending");

    if (error) {
        console.error("Error completing payment:", error);
        serverError("Failed to complete payment");
    }

    return { success: true };
}
