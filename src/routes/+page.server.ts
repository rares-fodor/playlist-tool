import { redirect, error } from "@sveltejs/kit";
import { lucia } from "$lib/auth";

import type { PageServerLoad, Actions, RequestEvent } from "./$types";


export const load: PageServerLoad = async (event) => {
    if (!event.locals.user || !event.locals.session) {
        return redirect(302, '/login');
    }
    // Request playlists
    const user_playlists = await fetch(`https://api.spotify.com/v1/users/${event.locals.user.spotify_id}/playlists`, {
        headers: {
            Authorization: `Bearer ${event.locals.session.access_token}`
        }
    });

    // Request was issued, we should check if the token is still available

    const playlist_data = await user_playlists.json();

    return {
        user: event.locals.user,
        playlists: playlist_data,
    }
}

export const actions: Actions = {
    default: async (event: RequestEvent) => {
        if (!event.locals.session) {
            return error(401, "Not logged in!");
        }
        await lucia.invalidateSession(event.locals.session.id);
        const session_cookie = lucia.createBlankSessionCookie();
        event.cookies.set(session_cookie.name, session_cookie.value, {
            path: "/",
            ...session_cookie.attributes
        });

        await lucia.deleteExpiredSessions();
        return redirect(302, "/login");
    },
}

