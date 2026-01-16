import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/Landing";
import RolodexPage from "@/app/app/rolodex/page";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if user is on allowlist
    const { data: allowlistEntry } = await supabase
      .from("allowlist")
      .select("email")
      .eq("email", user.email?.toLowerCase())
      .single();

    if (allowlistEntry) {
      // Check if user has completed payment
      const { data: payment } = await supabase
        .from("user_payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .single();

      // If no payment, redirect to payment page
      if (!payment) {
        redirect("/payment");
      }

      return <RolodexPage />;
    }
  }

  return <Landing />;
}
