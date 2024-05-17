import { error } from "@sveltejs/kit"

import type { APIError, PlaylistedTrack, Page } from "$lib/api_types";
import type { Actions, PageServerLoad } from "./$types"


export const load: PageServerLoad = async (event) => {
    let url = `https://api.spotify.com/v1/playlists/${event.params.id}/tracks`;
    let pages: Page<PlaylistedTrack>[] = [];

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

        const tracks_at_offset: Page<PlaylistedTrack> = await response.json();
        pages.push(tracks_at_offset);

        if (tracks_at_offset.next === null) {
            break;
        }
        url = tracks_at_offset.next;
    }

    const tracks: PlaylistedTrack[] = pages.flatMap((page) => page.items)

    return {
        id: event.params.id,
        tracks: tracks,
    }
}

export const actions: Actions = {
    default: async (event) => {
        let data = await event.request.formData();
        console.log(data);
    }
}
