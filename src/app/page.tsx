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
      return <RolodexPage />;
    }
  }

  return <Landing />;
}
