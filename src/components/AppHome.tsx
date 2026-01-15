"use client";

import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AppHomeProps {
  user: User;
}

export default function AppHome({ user }: AppHomeProps) {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/sign-in");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sign Out Button - Top Right */}
      <div className="absolute top-6 right-8">
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

