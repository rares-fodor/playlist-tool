import { error, redirect } from '@sveltejs/kit';
import { generateId } from 'lucia';
import { lucia, spotify_auth } from '$lib/auth';
import { db } from '$lib/db';

import type { RequestEvent } from './$types';
import type { DatabaseUserAttributes } from '$lib/db';


export async function GET(event: RequestEvent): Promise<Response> {
    const err = event.url.searchParams.get('error') ?? null;
    if (err !== null) {
        return error(400, err);
    }

    const code = event.url.searchParams.get('code');
    const state = event.url.searchParams.get('state');
    const storedState = event.cookies.get('oauth_state') ?? null;
    if (state === null || state !== storedState) {
        return error(400, 'State missing or mismatched!');
    }
    if (code === null) {
        return error(400, 'Auth code missing!');
    }

    const tokens = await spotify_auth.validateAuthorizationCode(code);

    // Request user data
    const spotify_user = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${tokens.accessToken}`
        }
    });

    const user_data = await spotify_user.json();
    const existing_user = db.prepare("SELECT * FROM user WHERE spotify_id = ?").get(user_data.id) as
        | DatabaseUserAttributes
        | undefined

    if (existing_user) {
        const session = await lucia.createSession(existing_user.id, {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            access_token_expires_at: tokens.accessTokenExpiresAt.toISOString(),
        });
        const session_cookie = lucia.createSessionCookie(session.id);
        event.cookies.set(session_cookie.name, session_cookie.value, {
            path: "/",
            ...session_cookie.attributes
        });
    } else {
        const id = generateId(16);
        db.prepare("INSERT INTO user (id, username, spotify_id) VALUES (?, ?, ?)").run(
            id,
            user_data.display_name,
            user_data.id
        );
        const session = await lucia.createSession(id, {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            access_token_expires_at: tokens.accessTokenExpiresAt.toISOString(),
        });
        const session_cookie = lucia.createSessionCookie(session.id);
        event.cookies.set(session_cookie.name, session_cookie.value, {
            path: "/",
            ...session_cookie.attributes
        });
    }

    return redirect(302, '/');
}

