import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, serverError, type ServerSupabaseClient } from "@/server/api/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const designPartnerAmountCents = 10000;

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
