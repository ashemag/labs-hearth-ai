import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: pendingPayment, error: pendingPaymentError } = await supabase
            .from("user_payments")
            .select("id, stripe_payment_intent_id")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (pendingPaymentError) {
            console.error("Error loading pending payment:", pendingPaymentError);
            return NextResponse.json({ error: "Failed to load payment" }, { status: 500 });
        }

        if (!pendingPayment?.stripe_payment_intent_id) {
            return NextResponse.json({ error: "No pending payment found" }, { status: 400 });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(
            pendingPayment.stripe_payment_intent_id
        );

        if (
            paymentIntent.status !== "succeeded" ||
            paymentIntent.metadata.user_id !== user.id
        ) {
            return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
        }

        const { error } = await supabase
            .from("user_payments")
            .update({
                status: "completed",
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", pendingPayment.id)
            .eq("user_id", user.id)
            .eq("status", "pending");

        if (error) {
            console.error("Error completing payment:", error);
            return NextResponse.json({ error: "Failed to complete payment" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error completing payment:", error);
        const message = error instanceof Error ? error.message : "Failed to complete payment";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

