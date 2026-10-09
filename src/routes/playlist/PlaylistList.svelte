<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { createEventDispatcher, tick } from "svelte";
  import { Eye, EyeOff } from "lucide-svelte";

  import type { Playlist } from "$lib/api_types";

  export let playlists: Playlist[];
  export let label: string;
  export let id: string | undefined = undefined;
  // Spotify id of the logged-in user, to show "you" as the owner
  export let userId: string | undefined;

  const dispatch = createEventDispatcher<{ toggle: Playlist }>();

  /* Roving focus: the list is a single Tab stop, only the focused row's link has tabindex=0.
   * Kept as an index so the focus stays in place when a playlist leaves the list. */
  let focusedIndex = 0;
  let listElem: HTMLUListElement;

  const link = (index: number) =>
    listElem?.querySelectorAll<HTMLAnchorElement>(":scope > li > a")[index] ?? null;

  $: if (focusedIndex > playlists.length - 1) focusedIndex = Math.max(playlists.length - 1, 0);

  function focusRow(index: number) {
    focusedIndex = Math.min(Math.max(index, 0), playlists.length - 1);
    link(focusedIndex)?.focus();
  }

  async function toggle(index: number) {
    const hadFocus = link(index) === document.activeElement;
    dispatch("toggle", playlists[index]);
    if (!hadFocus) {
      return;
    }
    // The row moves to the other list; keep focus at the same position in this one
    await tick();
    // Hiding the last row unmounts this list
    if (listElem?.isConnected && playlists.length > 0) {
      focusRow(index);
    } else {
      document.getElementById("main")?.focus();
    }
  }

  function onKeydown(event: KeyboardEvent, index: number) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      return;
    }
    const key = event.key;
    if (key === "ArrowUp") focusRow(index - 1);
    else if (key === "ArrowDown") focusRow(index + 1);
    else if (key === "Home") focusRow(0);
    else if (key === "End") focusRow(playlists.length - 1);
    // Enter opens the link natively; Space is added to match the track list
    else if (key === " ") {
      // A held key would click again on every auto-repeat
      if (!event.repeat) link(index)?.click();
    }
    else if (key === "h" || key === "H") toggle(index);
    else return;
    event.preventDefault();
  }
</script>

<!-- Each row's toggle button is out of the Tab order; H toggles the focused row -->
<ul bind:this={listElem} {id} aria-label={label} aria-describedby="playlist-list-help" class="divide-y">
  {#each playlists as playlist, i (playlist.id)}
    {@const action = playlist.isVisible ? "Hide" : "Show"}
    <li class="flex items-center gap-2 py-1">
      <a
        href={`/playlist/${playlist.id}`}
        tabindex={i === focusedIndex ? 0 : -1}
        on:keydown={(e) => onKeydown(e, i)}
        on:focus={() => (focusedIndex = i)}
        class="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/60"
      >
        <Icon src={playlist.images[0]?.url} size="medium" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate font-medium" class:text-muted-foreground={!playlist.isVisible}>
            {playlist.name}
          </span>
          <span class="truncate text-sm text-muted-foreground">
            {playlist.tracks.total}
            {playlist.tracks.total === 1 ? "track" : "tracks"} ·
            {playlist.owner.id === userId ? "You" : playlist.owner.display_name}
          </span>
        </span>
      </a>
      <Tooltip.Root>
        <Tooltip.Trigger asChild let:builder>
          <Button
            variant="ghost"
            size="icon"
            tabindex={-1}
            aria-label={`${action} ${playlist.name}`}
            builders={[builder]}
            on:click={() => toggle(i)}
            class="shrink-0 text-muted-foreground"
          >
            {#if playlist.isVisible}
              <Eye class="h-5 w-5" aria-hidden="true" />
            {:else}
              <EyeOff class="h-5 w-5" aria-hidden="true" />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{action}</Tooltip.Content>
      </Tooltip.Root>
    </li>
  {/each}
</ul>
