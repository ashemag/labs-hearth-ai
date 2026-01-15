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

    // If user is authenticated, verify they're on the allowlist
    if (user) {
        const { data: allowlistEntry } = await supabase
            .from("allowlist")
            .select("email")
            .eq("email", user.email?.toLowerCase())
            .single();

        if (!allowlistEntry) {
            // User is authenticated but NOT on allowlist - sign them out immediately
            await supabase.auth.signOut();

            // If they're trying to access anything other than public pages, redirect to sign-in
            if (request.nextUrl.pathname !== "/" &&
                !request.nextUrl.pathname.startsWith("/sign-") &&
                !request.nextUrl.pathname.startsWith("/api/")) {
                const url = request.nextUrl.clone();
                url.pathname = "/sign-in";
                return NextResponse.redirect(url);
            }
        } else {
            // User is on allowlist - redirect away from auth pages
            if (request.nextUrl.pathname === "/sign-in" ||
                request.nextUrl.pathname === "/sign-up") {
                const url = request.nextUrl.clone();
                url.pathname = "/";
                return NextResponse.redirect(url);
            }
        }
    }

    return supabaseResponse;
}

