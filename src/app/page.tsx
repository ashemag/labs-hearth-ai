import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/Landing";
import { RolodexPage } from "@/features/rolodex";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home / Hearth",
};

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

      // If no payment, start with the product onboarding step.
      if (!payment) {
        redirect("/onboarding");
      }

      return <RolodexPage />;
    }
  }

  return <Landing />;
}
