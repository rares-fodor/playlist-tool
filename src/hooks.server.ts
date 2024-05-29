import { redirect } from "@sveltejs/kit";
import { lucia, spotify_auth } from "$lib/auth";
import { db } from "$lib/db";

import type { Session } from "lucia";
import type { Handle } from "@sveltejs/kit";


export const handle: Handle = async ({ event, resolve }) => {
    const sessionId = event.cookies.get(lucia.sessionCookieName);

    if (!sessionId) {
        const pathname = event.url.pathname
        if (pathname == '/login' || pathname.startsWith('/api/auth')) {
            event.locals.user = null;
            event.locals.session = null;
            return resolve(event);
        }
        return redirect(302, '/login');
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (session && session.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: "/",
            ...sessionCookie.attributes
        });
    }

    if (!session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: "/",
            ...sessionCookie.attributes
        })
    }

    // Test for token refresh
    if (session) {
        if (should_refresh_token(session.access_token_expires_at)) {
            refresh_token(session);
        }
    }

    event.locals.user = user;
    event.locals.session = session;

    // Disallow connected users from reaching /login
    if (event.url.pathname.startsWith('/login')) {
        return redirect(302, '/');
    }

    return resolve(event);
}


function should_refresh_token(expires_at: string) {
    const expiration = new Date(expires_at).getTime();
    const now = new Date().getTime();
    const threshold = 5 * 60000; // 5 minutes

    return expiration - now < 0 || expiration - now < threshold;
}

async function refresh_token(session: Session) {
    const tokens = await spotify_auth.refreshAccessToken(session.refresh_token);
    const refresh_token = tokens.refreshToken === undefined ? session.refresh_token : tokens.refreshToken;

    const stmt = db.prepare(`UPDATE session SET
                            access_token = ?,
                            refresh_token = ?,
                            access_token_expires_at = ?
                            WHERE id = ?`);
    const info = stmt.run(
        tokens.accessToken,
        refresh_token,
        tokens.accessTokenExpiresAt.toISOString(),
        session.id
    );

    console.log(info);

    session.refresh_token = refresh_token;
    session.access_token_expires_at = tokens.accessTokenExpiresAt.toISOString();
}

