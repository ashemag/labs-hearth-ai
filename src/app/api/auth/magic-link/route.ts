import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Get the origin from the request (works for both localhost and production)
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://labs.hearth.ai';

        // Use service role to check allowlist and generate link
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check allowlist
        const { data: allowlistEntry } = await supabase
            .from('allowlist')
            .select('email')
            .eq('email', email.toLowerCase())
            .single();

        if (!allowlistEntry) {
            return NextResponse.json({ error: 'not_allowed' }, { status: 403 });
        }

        // Generate magic link using Supabase Admin API
        // Use the auth callback route which will handle the code exchange
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email.toLowerCase(),
            options: {
                redirectTo: `${origin}/auth/callback`,
            },
        });

        if (error || !data.properties?.action_link) {
            console.error('Failed to generate magic link:', error);
            return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
        }

        // Replace the redirect_to parameter to ensure it goes to the correct origin's callback
        // This handles cases where Supabase dashboard Site URL differs from request origin
        let actionLink = data.properties.action_link;

        // Extract and replace the redirect_to parameter in the action link
        const actionUrl = new URL(actionLink);
        actionUrl.searchParams.set('redirect_to', `${origin}/auth/callback`);
        actionLink = actionUrl.toString();

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
            from: 'Hearth Labs <noreply@hearth.ai>',
            to: email,
            subject: 'Sign in to Hearth',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; padding: 48px 24px;">
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <img src="${origin}/brand/logo_square_new.png" alt="Hearth" width="40" height="40" style="display: block;">
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1a1a2e; text-align: center;">
                    Sign in to Hearth
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 32px;">
                  <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666; text-align: center;">
                    Click the button below to sign in. This link will expire in 24 hours.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <a href="${actionLink}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a2e; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 8px;">
                    Sign in
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #999; text-align: center;">
                    If you didn't request this email, you can safely ignore it.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #eee; padding-top: 24px;">
                  <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                    Hearth · Relational Intelligence
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
        });

        if (emailError) {
            console.error('Failed to send email:', emailError);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Magic link error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

