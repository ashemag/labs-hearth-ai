import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// DEV ONLY: Auto sign-in for local development
// This bypasses the magic link flow when running on localhost

const DEV_EMAIL = 'ashe.magalhaes@gmail.com';

export async function POST(request: Request) {
    // Only allow in development
    const origin = request.headers.get('origin') || '';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    if (!isLocalhost) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if user exists, if not create them
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let user = existingUsers?.users.find(u => u.email === DEV_EMAIL);

        if (!user) {
            // Create the user
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

        // Generate a magic link
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: DEV_EMAIL,
        });

        if (error || !data.properties?.hashed_token) {
            console.error('Failed to generate link:', error);
            return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
        }

        // Build a local verification URL that goes through our callback
        // The token_hash and type are what Supabase needs to verify
        const localUrl = new URL(`${origin}/auth/callback`);
        localUrl.searchParams.set('token_hash', data.properties.hashed_token);
        localUrl.searchParams.set('type', 'magiclink');
        localUrl.searchParams.set('next', '/');

        return NextResponse.json({ 
            url: localUrl.toString(),
            email: DEV_EMAIL 
        });
    } catch (error) {
        console.error('Dev login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

