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

        // Check if user already has a completed payment
        const { data: existingPayment } = await supabase
            .from("user_payments")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .single();

        if (existingPayment) {
            return NextResponse.json({ error: "Already paid", alreadyPaid: true }, { status: 400 });
        }

        // Create a PaymentIntent for $100.00
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 10000, // Amount in cents ($100.00)
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

        // Store pending payment record
        await supabase.from("user_payments").insert({
            user_id: user.id,
            email: user.email || "",
            stripe_payment_intent_id: paymentIntent.id,
            amount_cents: 10000,
            status: "pending",
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error: unknown) {
        console.error("Error creating payment intent:", error);
        const message = error instanceof Error ? error.message : "Failed to create payment intent";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


