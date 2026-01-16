import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has a completed payment
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
    } catch (error: unknown) {
        console.error("Error checking payment status:", error);
        const message = error instanceof Error ? error.message : "Failed to check payment status";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


