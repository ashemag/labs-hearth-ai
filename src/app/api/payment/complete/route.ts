import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Mark the most recent pending payment as completed
        const { error } = await supabase
            .from("user_payments")
            .update({
                status: "completed",
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
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


