"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthHandler() {
  const supabase = createClient();

  useEffect(() => {
    // Check for hash params (from magic link redirect)
    if (!window.location.hash || window.location.hash.length < 2) return;
    
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const error = hashParams.get("error");
    const errorDescription = hashParams.get("error_description");

    if (error) {
      console.error("Auth error:", error, errorDescription);
      // Redirect with clean URL
      window.location.replace(`/sign-in?error=${encodeURIComponent(errorDescription || error)}`);
      return;
    }

    if (accessToken && refreshToken) {
      // Set the session from the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to set session:", error);
          window.location.replace(`/sign-in?error=${encodeURIComponent(error.message)}`);
        } else {
          // Hard redirect to clean URL - this will reload with the session cookie set
          window.location.replace("/");
        }
      });
    }
  }, [supabase.auth]);

  return null;
}

