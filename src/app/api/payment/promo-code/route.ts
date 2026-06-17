import { NextResponse } from "next/server";
import {
    ApiError,
    readJsonObject,
    requiredString,
    withUser,
} from "@/server/api/route";
import {
    getFirstHundredPromoStatus,
    redeemFirstHundredPromo,
} from "@/server/payment/checkout";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, { user }) => {
    return NextResponse.json(await getFirstHundredPromoStatus(user.id));
});

export const POST = withUser(async (req, { supabase, user }) => {
    try {
        const body = await readJsonObject(req);
        const code = requiredString(body.code, "code");
        return NextResponse.json(await redeemFirstHundredPromo(supabase, user, code));
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            return NextResponse.json(error.body || { error: error.message }, { status: error.status });
        }

        console.error("Error applying promo code:", error);
        const message = error instanceof Error ? error.message : "Failed to apply promo code";
        return NextResponse.json({ error: message }, { status: 500 });
    }
});
