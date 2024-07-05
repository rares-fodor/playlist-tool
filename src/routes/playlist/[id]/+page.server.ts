import { error } from "@sveltejs/kit"

import type { APIError, PlaylistedTrack, Page } from "$lib/api_types";
import type { Actions, PageServerLoad } from "./$types"


export const load: PageServerLoad = async (event) => {
  console.log(`[${new Date(Date.now()).toISOString()}]: Requesting tracks for playlist ${event.params.id}`)
  const limit = 50;
  const base_url = `https://api.spotify.com/v1/playlists/${event.params.id}/tracks?limit=${limit}`;
  const access_token = event.locals.session?.access_token;
  const headers = {
    Authorization: `Bearer ${access_token}`
  }

  const initial_response = await fetch(base_url, { headers });
  if (initial_response.status !== 200) {
    const err = (await initial_response.json() as APIError).error;
    return error(err.status, err.message);
  }

  const initial_page: Page<PlaylistedTrack> = await initial_response.json();
  const total_tracks = initial_page.total;

  const requests = [];
  for (let offset = limit; offset < total_tracks; offset += limit) {
    const url = `${base_url}&offset=${offset}`;
    requests.push(fetch(url, { headers }).then(res => res.json()));
  }

  const pages: Page<PlaylistedTrack>[] = await Promise.all(requests);
  pages.unshift(initial_page);

  const tracks: PlaylistedTrack[] = pages.flatMap(page => page.items);

  // Add list IDs. Track's id field is insufficient if playlist contains duplicate tracks
  tracks.map((track, index) => track.id = `${track.track.id}:${index}`)

  return {
    id: event.params.id,
    tracks: tracks
  }
}
