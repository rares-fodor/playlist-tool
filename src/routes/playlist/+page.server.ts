import type { PageServerLoad, Actions } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { formSchema } from "./schema";
import { zod } from "sveltekit-superforms/adapters";
import { setUserPlaylistVisibility, toggleUserPlaylistVisibility } from "$lib/db";

export const load: PageServerLoad = async () => {
  return {
    form: await superValidate(zod(formSchema)),
  }
}

export const actions: Actions = {
  hidePlaylists: async (event) => {
    const form = await superValidate(event, zod(formSchema));

    toggleUserPlaylistVisibility(event.locals.user?.id!, form.data.ids)

    if (!form.valid) {
      return fail(400, {
        form
      })
    }
    return {
      form,
    }
  }
}
