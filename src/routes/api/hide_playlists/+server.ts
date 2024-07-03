import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST(event: RequestEvent): Promise<Response> {
  const data = await event.request.json();
  console.log(data)
  return json({
    message: "Ok"
  })
}