import { NextResponse } from "next/server";
import { ApiError, withUser } from "@/server/api/route";
import { createDesignPartnerPaymentIntent } from "@/server/payment/checkout";

export const POST = withUser(async (_req, { supabase, user }) => {
    try {
        return NextResponse.json(await createDesignPartnerPaymentIntent(supabase, user));
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            return NextResponse.json(error.body || { error: error.message }, { status: error.status });
        }

        console.error("Error creating payment intent:", error);
        const message = error instanceof Error ? error.message : "Failed to create payment intent";
        return NextResponse.json({ error: message }, { status: 500 });
    }
});
