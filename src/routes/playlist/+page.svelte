<script lang="ts">
  import { toast } from "svelte-sonner";
  import { ChevronRight } from "lucide-svelte";
  import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
  import PlaylistList from "./PlaylistList.svelte";

  import type { Playlist } from "$lib/api_types";
  import type { PageData } from "./$types";
  export let data: PageData;

  let hiddenOpen = false;

  $: visiblePlaylists = data.playlists.filter((pl) => pl.isVisible);
  $: hiddenPlaylists = data.playlists.filter((pl) => !pl.isVisible);

  // Optimistic: applied at once, reverted if the server rejects it
  async function setVisibility(playlist: Playlist, visible: boolean, undoable: boolean) {
    // Mutates the shared layout data, so the editor's target picker sees it without a reload
    playlist.isVisible = visible;
    data.playlists = data.playlists;

    if (undoable) {
      toast(`"${playlist.name}" is now ${visible ? "shown" : "hidden"}`, {
        action: {
          label: "Undo",
          onClick: () => setVisibility(playlist, !visible, false),
        },
      });
    }

    try {
      const response = await fetch("/api/hide_playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [playlist.id], visible }),
      });
      if (!response.ok) {
        throw new Error();
      }
    } catch {
      // Unless a later toggle has already changed it again
      if (playlist.isVisible === visible) {
        playlist.isVisible = !visible;
        data.playlists = data.playlists;
      }
      toast.error(`Couldn't ${visible ? "show" : "hide"} "${playlist.name}"`, {
        description: "Check your connection and try again.",
      });
    }
  }

  function onToggle(event: CustomEvent<Playlist>) {
    const playlist = event.detail;
    setVisibility(playlist, !playlist.isVisible, true);
  }
</script>

<svelte:head>
  <title>Playlists · Playlist Tool</title>
</svelte:head>

<!-- Fill the viewport below the app header so the list scrolls on its own, like the editor -->
<div class="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col py-6">
  <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Your playlists</h1>
  <p class="mt-1 text-sm text-muted-foreground">
    {visiblePlaylists.length} shown{#if hiddenPlaylists.length > 0}, {hiddenPlaylists.length} hidden{/if}
  </p>

  <!-- Negative margin + padding keeps row focus rings clear of the scroll area's clipping edge -->
  <OverlayScrollbarsComponent
    options={{
      scrollbars: {
        theme: "os-theme-dark",
        autoHide: "scroll",
      },
    }}
    class="-mx-1 mt-4 min-h-0 flex-1 border-b"
  >
    <div class="px-1 pb-1">
      {#if visiblePlaylists.length > 0}
        <PlaylistList
          playlists={visiblePlaylists}
          label="Playlists"
          userId={data.user?.spotify_id}
          on:toggle={onToggle}
        />
      {:else}
        <p class="py-8 text-center text-sm text-muted-foreground">
          {data.playlists.length > 0 ? "All your playlists are hidden." : "You don't have any playlists yet."}
        </p>
      {/if}

      {#if hiddenPlaylists.length > 0}
        <section class="mt-6 border-t pt-2">
          <h2>
            <button
              type="button"
              aria-expanded={hiddenOpen}
              aria-controls="hidden-playlists"
              on:click={() => (hiddenOpen = !hiddenOpen)}
              class="flex w-full items-center gap-2 rounded-md p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ChevronRight
                class="h-4 w-4 transition-transform {hiddenOpen ? 'rotate-90' : ''}"
                aria-hidden="true"
              />
              Hidden ({hiddenPlaylists.length})
            </button>
          </h2>
          {#if hiddenOpen}
            <PlaylistList
              id="hidden-playlists"
              playlists={hiddenPlaylists}
              label="Hidden playlists"
              userId={data.user?.spotify_id}
              on:toggle={onToggle}
            />
          {/if}
        </section>
      {/if}
    </div>
  </OverlayScrollbarsComponent>
</div>

<p id="playlist-list-help" class="sr-only">
  Use arrow keys to browse and Space or Enter to open. H hides or shows the playlist.
  Press question mark for all keyboard shortcuts.
</p>
