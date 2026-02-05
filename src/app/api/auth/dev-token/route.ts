import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// DEV ONLY: Auto sign-in for local development (iOS simulator)
const DEV_EMAIL = process.env.DEV_EMAIL || 'dev@localhost';

export async function POST(request: Request) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';
    const forwardedHost = request.headers.get('x-forwarded-host') || '';
    const isLocalhost =
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('::1') ||
        host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        host.includes('::1') ||
        forwardedHost.includes('localhost') ||
        forwardedHost.includes('127.0.0.1') ||
        forwardedHost.includes('::1');

    if (!isLocalhost) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const supabase = createAdminClient();

        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let user = existingUsers?.users.find(u => u.email === DEV_EMAIL);

        if (!user) {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: DEV_EMAIL,
                email_confirm: true,
            });

            if (createError) {
                console.error('Failed to create dev user:', createError);
                return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
            }
            user = newUser.user;
        }

        const { data: allowlistEntry } = await supabase
            .from('allowlist')
            .select('email')
            .eq('email', DEV_EMAIL.toLowerCase())
            .maybeSingle();

        if (!allowlistEntry) {
            await supabase.from('allowlist').insert({ email: DEV_EMAIL.toLowerCase() });
        }

        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: DEV_EMAIL,
        });

        if (linkError || !linkData.properties?.action_link) {
            console.error('Failed to generate link:', linkError);
            return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
        }

        const actionUrl = new URL(linkData.properties.action_link);
        const token = actionUrl.searchParams.get('token');
        const type = actionUrl.searchParams.get('type') ?? 'magiclink';

        if (!token) {
            console.error('Magic link missing token:', linkData.properties.action_link);
            return NextResponse.json({ error: 'Failed to generate login token' }, { status: 500 });
        }

        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink' | 'email',
        });

        if (verifyError || !verifyData.session) {
            console.error('Failed to verify dev login:', verifyError);
            return NextResponse.json({ error: 'Failed to verify login' }, { status: 500 });
        }

        return NextResponse.json({
            access_token: verifyData.session.access_token,
            refresh_token: verifyData.session.refresh_token,
            user: {
                id: verifyData.user?.id ?? user?.id ?? 'unknown',
                email: verifyData.user?.email ?? DEV_EMAIL,
            },
        });
    } catch (error) {
        console.error('Dev token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
