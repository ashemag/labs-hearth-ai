import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/Landing";
import AppHome from "@/components/AppHome";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if user is on allowlist
    const { data: allowlistEntry } = await supabase
      .from("allowlist")
      .select("email")
      .eq("email", user.email?.toLowerCase())
      .single();

    if (allowlistEntry) {
      return <AppHome user={user} />;
    }
  }

  return <Landing />;
}
