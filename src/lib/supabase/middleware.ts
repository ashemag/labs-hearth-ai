import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect authenticated allowlisted users away from auth pages to home
    if (
        user &&
        (request.nextUrl.pathname === "/sign-in" ||
            request.nextUrl.pathname === "/sign-up")
    ) {
        // Check if user is on allowlist before redirecting to home
        const { data: allowlistEntry } = await supabase
            .from("allowlist")
            .select("email")
            .eq("email", user.email?.toLowerCase())
            .single();

        if (allowlistEntry) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            return NextResponse.redirect(url);
        } else {
            // User is authenticated but not on allowlist - sign them out
            await supabase.auth.signOut();
        }
    }

    return supabaseResponse;
}

