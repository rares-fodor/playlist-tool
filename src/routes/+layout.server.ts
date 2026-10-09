import type { Image } from "$lib/api_types";
import type { LayoutServerLoad } from "./$types";

// Only depends on locals, so this runs once per full page load, not on every navigation
export const load: LayoutServerLoad = async (event) => {
  const { user, session } = event.locals;
  if (!user || !session) {
    return { user, avatarUrl: null };
  }

  // Not stored with the user: there are no migrations, and Spotify can change the picture
  let avatarUrl: string | null = null;
  try {
    const response = await event.fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.ok) {
      const { images } = (await response.json()) as { images?: Image[] };
      // Smallest size that's still sharp in a 32px bubble
      const sorted = [...(images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
      avatarUrl = (sorted.find((image) => (image.width ?? 0) >= 64) ?? sorted.at(-1))?.url ?? null;
    }
  } catch {
    // The navbar falls back to the user's initial
  }

  return { user, avatarUrl };
};
