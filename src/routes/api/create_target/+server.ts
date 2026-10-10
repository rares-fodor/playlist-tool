import { json } from "@sveltejs/kit";

import type { RequestEvent } from "./$types";
import type { APIError, Image, Page, Playlist, PlaylistedTrack } from "$lib/api_types";
import { setUserPlaylistTarget } from "$lib/db";

// Creates a private playlist on Spotify and saves it as the source's target in the same request,
// so a created target is never left unsaved
export async function POST(event: RequestEvent): Promise<Response> {
  const user = event.locals.user;
  if (!user) {
    return json({ status: 401, message: "Not logged in." }, { status: 401 });
  }

  const data = await event.request.json();
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (typeof data.sourceId !== "string" || name === "") {
    return json({ status: 400, message: "A source playlist and a name are required." }, { status: 400 });
  }

  const response = await fetch("https://api.spotify.com/v1/me/playlists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${event.locals.session?.access_token}`,
    },
    body: JSON.stringify({
      name,
      description: data.description,
      public: false,
    }),
  });

  if (!response.ok) {
    const err = await response
      .json()
      .then((body: APIError) => body.error)
      .catch(() => ({ status: response.status, message: `Spotify responded with status ${response.status}.` }));
    return json(err, { status: err.status });
  }

  const created: Playlist = await response.json();

  let targetSaved = true;
  try {
    setUserPlaylistTarget(user.id, data.sourceId, created.id);
  } catch (e) {
    console.error(e);
    targetSaved = false;
  }

  // Same placeholder cover as the playlists layout gives playlists without images
  if (!created.images?.length) {
    created.images = [{ url: `https://placehold.co/300x300?text=${created.name[0]}`, height: 300, width: 300 } as Image];
  }
  // The editor checks the track count to decide whether a playlist can be committed to
  created.tracks ??= { items: [], total: 0 } as unknown as Page<PlaylistedTrack>;
  created.isVisible = true;
  created.targetId = undefined;

  return json({ playlist: created, targetSaved });
}
