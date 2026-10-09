import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { setUserTrackGroups, type TrackGroup } from "$lib/db";

const isGroup = (group: TrackGroup) =>
  typeof group?.id === "string" &&
  Array.isArray(group.members) &&
  group.members.length >= 2 &&
  group.members.every((m) => typeof m?.uri === "string" && Number.isInteger(m?.occurrence));

// Replaces the saved groups of a playlist
export async function POST(event: RequestEvent): Promise<Response> {
  const data = await event.request.json();

  if (typeof data.playlistId !== "string" || !Array.isArray(data.groups) || !data.groups.every(isGroup)) {
    return error(400, "Invalid groups");
  }

  setUserTrackGroups(event.locals.user!.id, data.playlistId, data.groups);

  return json({
    message: "Ok"
  });
}
