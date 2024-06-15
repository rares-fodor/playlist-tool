import { error } from "@sveltejs/kit";

import type { APIError, Page, Playlist } from "$lib/api_types";
import type { LayoutServerLoad } from "./$types";
import type { Image } from "$lib/api_types";


export const load: LayoutServerLoad = async (event) => {
    const user_id = event.locals.user?.spotify_id;
    console.log(`[${new Date(Date.now()).toISOString()}]: Requesting playlists for user ${user_id}`)

    const limit = 50;
    const base_url = `https://api.spotify.com/v1/users/${user_id}/playlists?limit=${limit}`;
    const headers = {
        Authorization: `Bearer ${event.locals.session?.access_token}`
    }

    const initial_response = await fetch(base_url, { headers });
    if (initial_response.status !== 200) {
        const err = (await initial_response.json() as APIError).error;
        return error(err.status, err.message);
    }

    const initial_page: Page<Playlist> = await initial_response.json();
    const total_playlists = initial_page.total;

    const requests = []
    for (let offset = limit; offset < total_playlists; offset += limit) {
        const url = `${base_url}&offset=${offset}`
        requests.push(fetch(url, { headers} ).then(res => res.json()));
    }

    const pages: Page<Playlist>[] = await Promise.all(requests);
    pages.unshift(initial_page)

    // Flatten items field of all Page items returned
    let playlists: Playlist[] = pages.flatMap((page) => page.items)

    let placeholderIconUrl = "https://placehold.co/300x300?text="
    playlists.map(playlist => { if (!playlist.images) { playlist.images = [{ url: `${placeholderIconUrl}${playlist.name[0]}`, height: 300, width: 300 } as Image]} })

    return {
        user: event.locals.user,
        playlists: playlists,
    }
}

