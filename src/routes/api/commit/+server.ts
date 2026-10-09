import { json } from "@sveltejs/kit";

import type { RequestEvent } from "./$types";
import type { APIError } from "$lib/api_types";


export async function POST(event: RequestEvent): Promise<Response> {
  const data = await event.request.json();
  const url = `https://api.spotify.com/v1/playlists/${data.id}/tracks`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${event.locals.session?.access_token}`,
    },
    body: JSON.stringify({
      uris: data.state,
    })
  });

  if (!response.ok) {
    const err = (await response.json() as APIError).error;
    return json(err, { status: err.status });
  }

  const snapshot = await response.json();
  console.log(snapshot);

  return json({
    message: "Ok"
  });
}
