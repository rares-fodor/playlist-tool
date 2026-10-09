import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { setUserPlaylistVisibility } from "$lib/db";

// Body: { ids: string[], visible: boolean }. Sets rather than toggles, so retries and undos are idempotent
export async function POST(event: RequestEvent): Promise<Response> {
  const data = await event.request.json().catch(() => undefined);
  if (
    !Array.isArray(data?.ids) ||
    !data.ids.every((id: unknown) => typeof id === "string") ||
    typeof data.visible !== "boolean"
  ) {
    return error(400, "Expected { ids: string[], visible: boolean }");
  }

  setUserPlaylistVisibility(event.locals.user?.id!, data.ids, data.visible);

  return json({
    message: "Ok"
  });
}
