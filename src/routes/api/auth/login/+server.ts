import { redirect } from "@sveltejs/kit";
import { spotify_auth } from "$lib/auth";
import { generateState } from "arctic";
import { dev } from "$app/environment";
import type { RequestEvent } from "./$types";


export async function GET(event: RequestEvent): Promise<Response> {
    const state = generateState();
    const auth_url = await spotify_auth.createAuthorizationURL(state, {
        scopes: [
            "user-read-email",
            "user-read-private",
            "playlist-read-private",
            "playlist-read-collaborative",
            "playlist-modify-private",
            "playlist-modify-public"
        ]
    });

    event.cookies.set("oauth_state", state, {
        path: "/",
        httpOnly: true,
        secure: !dev,
        maxAge: 60 * 10
    })

    return redirect(302, auth_url.toString());
}
