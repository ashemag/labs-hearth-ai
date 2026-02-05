import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service role key (admin privileges).
 * Use this for server-side operations that need to bypass RLS.
 *
 * IMPORTANT: Never expose this client to the browser.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
