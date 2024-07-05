import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { setUserPlaylistTarget } from "$lib/db";
import { invalidate } from "$app/navigation";

export async function POST(event: RequestEvent): Promise<Response> {
  const data = await event.request.json();

  setUserPlaylistTarget(event.locals.user?.id!, data.sourceId, data.targetId);

  return json({
    message: "Ok"
  });
}
