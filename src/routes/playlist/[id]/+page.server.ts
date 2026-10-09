import { error } from "@sveltejs/kit"

import type { APIError, PlaylistedTrack, Page } from "$lib/api_types";
import type { Actions, PageServerLoad } from "./$types"
import { getUserTrackGroups, setUserTrackGroups, type TrackGroup } from "$lib/db";
import { memberKeys, pullTogether, type GroupMap } from "$lib/track-groups";


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

  const { groups, rank, dissolvedGroups } = loadGroups(event.locals.user!.id, event.params.id, tracks);

  return {
    id: event.params.id,
    // Groups pulled together, so the editor starts (and resets to) a valid order
    tracks: pullTogether(tracks, groups, rank),
    groups: [...groups],
    dissolvedGroups
  }
}

/* Resolves saved groups against the tracks as they are on Spotify now. Members no longer in the
 * playlist are dropped, and groups left with fewer than 2 are dissolved; both are saved back. */
function loadGroups(userId: string, playlistId: string, tracks: PlaylistedTrack[]) {
  const saved = getUserTrackGroups(userId, playlistId);

  const idByKey = new Map<string, string>();
  for (const [id, { uri, occurrence }] of memberKeys(tracks)) {
    idByKey.set(`${occurrence}:${uri}`, id);
  }

  const groups: GroupMap = new Map();
  // Position of each member within its saved group
  const rank = new Map<string, number>();
  const kept: TrackGroup[] = [];
  let membersDropped = false;
  for (const group of saved) {
    const ids = group.members
      .map(({ uri, occurrence }) => idByKey.get(`${occurrence}:${uri}`))
      .filter((id): id is string => id !== undefined && !groups.has(id));
    membersDropped ||= ids.length !== group.members.length;
    if (ids.length < 2) {
      continue;
    }
    ids.forEach((id, position) => {
      groups.set(id, group.id);
      rank.set(id, position);
    });
    kept.push({ id: group.id, members: group.members.filter(({ uri, occurrence }) =>
      ids.includes(idByKey.get(`${occurrence}:${uri}`)!)) });
  }

  if (membersDropped) {
    setUserTrackGroups(userId, playlistId, kept);
  }

  return { groups, rank, dissolvedGroups: saved.length - kept.length };
}
