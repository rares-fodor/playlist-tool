import { redirect, error } from "@sveltejs/kit";
import { lucia } from "$lib/auth";

import type { PageServerLoad, Actions, RequestEvent } from "./$types";

// Logging out is POST-only (from the header menu); a plain visit goes home
export const load: PageServerLoad = async () => {
  redirect(302, "/");
};

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    if (!event.locals.session) {
      return error(401, "Not logged in!");
    }
    await lucia.invalidateSession(event.locals.session.id);
    const session_cookie = lucia.createBlankSessionCookie();
    event.cookies.set(session_cookie.name, session_cookie.value, {
      path: "/",
      ...session_cookie.attributes
    });

    await lucia.deleteExpiredSessions();
    return redirect(302, "/login");
  },
}
