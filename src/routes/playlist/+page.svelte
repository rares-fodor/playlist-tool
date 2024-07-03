<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import { Toggle } from "$lib/components/ui/toggle";
  import * as Form from "$lib/components/ui/form";
  import { superForm } from "sveltekit-superforms";
  import { formSchema } from "./schema"
  import { zodClient } from "sveltekit-superforms/adapters";
  import { Eye, EyeOff } from "lucide-svelte";

  import type { PageData } from "./$types";
  export let data: PageData;

  const form = superForm(data.form, {
    validators: zodClient(formSchema),
  });

  const { form: formData, enhance } = form

  function hidePlaylist(id: string) {
    $formData.ids = [...$formData.ids, id]
  }
  function showPlaylist(id: string) {
    $formData.ids = $formData.ids.filter((i) => i !== id)
  }

  $: visiblePlaylists = data.playlists.filter(pl => pl.visibility)
  $: hiddenPlaylists = data.playlists.filter(pl => !pl.visibility)

</script>

<main class="grid">
  <form action="?/hidePlaylists" method="POST" use:enhance class="mx-auto lg:min-w-[60rem]">
    {#if $formData.ids.length > 0}
      <div class="fixed top-4 right-4">
        <Form.Button>Save changes</Form.Button>
      </div>
    {/if}
    <Form.Fieldset {form} name="ids" class="pt-2">
      <ul aria-label="Playlists" class="list-none">
        {#each [visiblePlaylists, hiddenPlaylists] as playlists}
          {#if playlists === hiddenPlaylists && hiddenPlaylists.length > 0}
            <hr class="border-t border-t-gray-500">
            <div class="text-sm text-gray-500 mt-1 text-right">HIDDEN PLAYLISTS</div>
          {/if}
          {#if playlists === visiblePlaylists && visiblePlaylists.length > 0}
            <hr class="border-t border-t-gray-700">
            <div class="text-sm text-gray-500 mt-1 text-right">PLAYLISTS</div>
          {/if}
          {#each playlists as playlist (playlist.id)}
            {@const checked = $formData.ids.includes(playlist.id)}
            <div class="flex items-center gap-2 border-b border-b-gray-300 p-2">
              <Form.Control let:attrs >
                <Form.Label>
                  <li>
                    <a href={`/playlist/${playlist.id}`}>
                      <div class="flex align-middle gap-3 py-1">
                        <Icon size="medium" src={playlist.images[0].url} />
                        <div class="flex items-center">
                          <span>{playlist.name}</span>
                        </div>
                      </div>
                    </a>
                  </li>
                </Form.Label>
                <Toggle
                  size="sm"
                  class="ml-auto"
                  pressed={checked}
                  onPressedChange={(v) => {
                    if (v) {
                      hidePlaylist(playlist.id);
                    } else {
                      showPlaylist(playlist.id);
                    }
                  }}
                >
                  {#if playlists === visiblePlaylists}
                    {#if checked}
                      <EyeOff />
                    {:else}
                      <Eye />
                    {/if}
                  {:else if playlists === hiddenPlaylists}
                    {#if checked}
                      <Eye />
                    {:else}
                      <EyeOff />
                    {/if}
                  {/if}
                </Toggle>
                <input
                  hidden
                  type="checkbox"
                  name={attrs.name}
                  value={playlist.id}
                  {checked}
                />
              </Form.Control>
            </div>
          {/each}
        {/each}
      </ul>
      <Form.FieldErrors />
    </Form.Fieldset>
  </form>
</main>
