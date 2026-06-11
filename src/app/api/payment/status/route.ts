import { NextResponse } from "next/server";
import { withUser } from "@/server/api/route";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, { supabase, user }) => {
    const { data: payment } = await supabase
        .from("user_payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .single();

    return NextResponse.json({
        hasPaid: !!payment,
        payment: payment || null,
    });
});
