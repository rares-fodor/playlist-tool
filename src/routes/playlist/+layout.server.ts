import { error } from "@sveltejs/kit";

import type { APIError, Page, Playlist } from "$lib/api_types";
import type { LayoutServerLoad } from "./$types";



export const load: LayoutServerLoad = async (event) => {
    let url = `https://api.spotify.com/v1/users/${event.locals.user?.spotify_id}/playlists`;
    let pages: Page<Playlist>[] = [];

    // Get all pages
    while (true) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${event.locals.session?.access_token}`
            }
        });
        if (response.status !== 200) {
            const err = (await response.json() as APIError).error;
            return error(err.status, err.message);
        }

        const playlists_at_offset: Page<Playlist> = await response.json();
        pages.push(playlists_at_offset);

        if (playlists_at_offset.next === null) {
            break;
        }

        url = playlists_at_offset.next
    }

    // Flatten items field of all Page items returned
    const playlists: Playlist[] = pages.flatMap((page) => page.items)

    return {
        user: event.locals.user,
        playlists: playlists,
    }
}

