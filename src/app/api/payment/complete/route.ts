import { NextResponse } from "next/server";
import { ApiError, withUser } from "@/server/api/route";
import { completeDesignPartnerPayment } from "@/server/payment/checkout";

export const POST = withUser(async (_req, { supabase, user }) => {
    try {
        return NextResponse.json(await completeDesignPartnerPayment(supabase, user.id));
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            return NextResponse.json(error.body || { error: error.message }, { status: error.status });
        }

        console.error("Error completing payment:", error);
        const message = error instanceof Error ? error.message : "Failed to complete payment";
        return NextResponse.json({ error: message }, { status: 500 });
    }
});
