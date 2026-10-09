<script lang="ts">
  import TrackList from "./TrackList.svelte";
  import TargetPickerDialog from "./TargetPickerDialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import UserMenu from "$lib/components/UserMenu.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import { beforeNavigate } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    loadIndex,
    pullTogether,
    serializeGroups,
    toBlocks,
    type GroupMap,
  } from "$lib/track-groups";
  import MaterialSymbolsArrowBack from "~icons/material-symbols/arrow-back";
  import MaterialSymbolsKeyboardArrowDown from "~icons/material-symbols/keyboard-arrow-down";
  import MaterialSymbolsKeyboardArrowUp from "~icons/material-symbols/keyboard-arrow-up";
  import MaterialSymbolsMoreHoriz from "~icons/material-symbols/more-horiz";
  import MaterialSymbolsShuffle from "~icons/material-symbols/shuffle";
  import MaterialSymbolsRestartAlt from "~icons/material-symbols/restart-alt";
  import MaterialSymbolsSwapVert from "~icons/material-symbols/swap-vert";
  import MaterialSymbolsClose from "~icons/material-symbols/close";
  import MaterialSymbolsLink from "~icons/material-symbols/link";
  import MaterialSymbolsLinkOff from "~icons/material-symbols/link-off";
  import MaterialSymbolsNestClockFarsightAnalogOutline from "~icons/material-symbols/nest-clock-farsight-analog-outline";

  import type { PageData } from "./$types";
  import type { Playlist, PlaylistedTrack } from "$lib/api_types";

  export let data: PageData;

  enum SortDirection {
    None = 0,
    Ascending = 1,
    Descending = -1,
  }

  // Update both when expanding to more/other columns
  // NOTE: Should be refactored, these values are used as both the button text and css Subclass
  type SortBy = "Custom" | "Title" | "Album";
  // Allow each block to infer type correctly (skip 'custom', we don't need a button for it)
  const sortableColumns: SortBy[] = ["Title", "Album"];

  interface SortState {
    column: SortBy;
    direction: SortDirection;
  }
  let sortState: SortState = {
    column: "Custom",
    direction: SortDirection.None,
  };

  // Manual sort order, saved when sorting by table header (title/album)
  let user_order = [...data.tracks];

  // Track groups, by synthetic track id. Saved as soon as they change, independent of commit.
  let groups: GroupMap = new Map(data.groups);

  // Order the page was loaded with (groups already pulled together), for "Reset to original order"
  const loaded_order = [...data.tracks];
  // Order of the playlist on Spotify, which saved group members are identified against
  let spotify_order = [...data.tracks].sort((a, b) => loadIndex(a) - loadIndex(b));
  // Order last known to be on Spotify; the editor is dirty when the current order differs
  let committed_ids = data.tracks.map((t) => t.id);

  const sameOrder = (tracks: PlaylistedTrack[], ids: string[]) =>
    tracks.length === ids.length && tracks.every((t, i) => t.id === ids[i]);

  $: isDirty = !sameOrder(data.tracks, committed_ids);
  // Groups made since loading pull together in the original order too
  $: resetOrder = pullTogether(loaded_order, groups);
  $: isLoadedOrder = sameOrder(
    data.tracks,
    resetOrder.map((t) => t.id),
  );

  // Playlist data
  let current_playlist = data.playlists.find(e => e.id === data.id)!;

  const playlistTooLarge = (playlist: Playlist) => {
    return playlist.tracks.total > 100;
  };
  const playlistNotOnwned = (playlist: Playlist) => {
    return playlist.owner.id !== data.user?.spotify_id;
  };
  const playlistCollaborative = (playlist: Playlist) => {
    return playlist.collaborative;
  };

  const canCommit = (playlist: Playlist) => {
    return (
      !playlistTooLarge(playlist) &&
      !playlistNotOnwned(playlist) &&
      !playlistCollaborative(playlist)
    );
  };

  const valid_targets = data.playlists.filter(canCommit).filter(pl => pl.isVisible);

  // Saved target if it's still valid, otherwise the playlist itself when possible
  let target_playlist: Playlist | undefined =
    valid_targets.find((e) => e.id === current_playlist.targetId) ??
    (canCommit(current_playlist) ? current_playlist : undefined);

  $: commitDisabledReason = (() => {
    if (target_playlist !== undefined) {
      return undefined;
    }
    if (playlistNotOnwned(current_playlist)) {
      return "You don't own this playlist. Choose a target playlist to commit to.";
    } else if (playlistTooLarge(current_playlist)) {
      return "This playlist has more than 100 tracks. Choose a target playlist to commit to.";
    } else if (playlistCollaborative(current_playlist)) {
      return "Collaborative playlists can't be committed to. Choose a target playlist.";
    }
    return "Choose a target playlist to commit to.";
  })();

  // A manual reorder while sorted by a column adopts the sorted order as the custom order,
  // so cycling the sort back to "none" doesn't discard the move
  function adoptCurrentOrder() {
    if (sortState.column !== "Custom") {
      sortState = { column: "Custom", direction: SortDirection.None };
    }
  }

  // Durstenfeld shuffle, of blocks so groups stay together and in order
  function shuffleHandler() {
    adoptCurrentOrder();
    const blocks = toBlocks(data.tracks, groups);
    for (let i = blocks.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let aux = blocks[i];
      blocks[i] = blocks[j];
      blocks[j] = aux;
    }
    data.tracks = blocks.flat();
  }

  function reverseHandler() {
    adoptCurrentOrder();
    data.tracks = toBlocks(data.tracks, groups).reverse().flat();
  }

  function resetHandler() {
    adoptCurrentOrder();
    data.tracks = [...resetOrder];
  }

  onMount(() => {
    if (data.dissolvedGroups > 0) {
      const count = data.dissolvedGroups === 1 ? "1 group" : `${data.dissolvedGroups} groups`;
      toast.info(`${count} dissolved`, {
        description: "Tracks in it are no longer in the playlist.",
      });
    }
  });

  async function saveGroups() {
    try {
      const response = await fetch("/api/save_groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: current_playlist.id,
          groups: serializeGroups(data.tracks, groups, spotify_order),
        }),
      });
      if (!response.ok) {
        throw new Error();
      }
    } catch {
      toast.error("Couldn't save groups", {
        description: "They'll be lost when you leave this page.",
      });
    }
  }

  // Selection state and group actions live in the track list; the toolbar here drives them
  let trackList: TrackList;
  let selectedCount = 0;
  let canGroup = false;
  let canUngroup = false;

  $: groupCount = new Set(groups.values()).size;
  let clearGroupsDialogOpen = false;

  function onGroupsChange(event: CustomEvent<{ reordered: boolean }>) {
    if (event.detail.reordered) {
      adoptCurrentOrder();
    }
    saveGroups();
  }

  let commitDialogOpen = false;
  let committing = false;

  // Send URI array to back-end to be commited to Spotify
  async function commit() {
    const target = target_playlist;
    if (target === undefined) {
      return;
    }
    const playlist_order = data.tracks.map((e) => e.track.uri).slice(0, 100);

    committing = true;
    try {
      const response = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          state: playlist_order,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => undefined);
        toast.error(`Couldn't commit to "${target.name}"`, {
          description: err?.message ?? `Spotify responded with status ${response.status}.`,
        });
        return;
      }

      fetch("/api/save_target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: current_playlist.id,
          targetId: target.id,
        }),
      })
      // Maintain consistent data without a page reload
      current_playlist.targetId = target.id;
      committed_ids = data.tracks.map((t) => t.id);
      // Saved groups identify duplicate tracks by their Spotify order, which just changed
      if (target.id === current_playlist.id) {
        spotify_order = [...data.tracks];
        if (groups.size > 0) {
          saveGroups();
        }
      }

      toast.success(`Committed ${playlist_order.length} tracks to "${target.name}"`);
    } catch {
      toast.error(`Couldn't commit to "${target.name}"`, {
        description: "Check your connection and try again.",
      });
    } finally {
      committing = false;
      commitDialogOpen = false;
    }
  }

  beforeNavigate(({ type, cancel }) => {
    if (!isDirty) {
      return;
    }
    // Closing or reloading the tab: cancelling makes the browser show its own prompt
    if (type === "leave") {
      cancel();
      return;
    }
    if (!confirm("You have changes that haven't been committed. Leave anyway?")) {
      cancel();
    }
  });

  // Groups sort as blocks, keyed by their first track
  function sortTracks(column: SortBy, direction: SortDirection) {
    const blocks = toBlocks(data.tracks, groups);
    if (column === "Title") {
      blocks.sort(
        (a, b) => direction * a[0].track.name.localeCompare(b[0].track.name),
      );
    } else if (column === "Album") {
      blocks.sort(
        (a, b) =>
          direction * a[0].track.album.name.localeCompare(b[0].track.album.name),
      );
    }
    data.tracks = blocks.flat();
  }

  function onColumnClicked(column: SortBy) {
    if (
      sortState.column === "Custom" &&
      sortState.direction === SortDirection.None
    ) {
      user_order = [...data.tracks];
    }

    if (sortState.column === column) {
      sortState.direction = ((sortState.direction + 2) % 3) - 1;
    } else {
      sortState.column = column;
      sortState.direction = SortDirection.Ascending;
    }

    if (sortState.direction === SortDirection.None) {
      data.tracks = [...user_order];
      sortState.column = "Custom";
    } else {
      sortTracks(column, sortState.direction);
    }
  }

  const sortDescription = (column: SortBy, state: SortState) => {
    if (state.column !== column || state.direction === SortDirection.None) {
      return "not sorted";
    }
    return state.direction === SortDirection.Ascending ? "sorted ascending" : "sorted descending";
  };
</script>

<svelte:head>
  <title>{current_playlist.name} · Playlist Tool</title>
</svelte:head>

<!-- Fill the viewport so the track list scrolls on its own -->
<div class="flex h-dvh flex-col py-6">
  <div class="mb-4 flex items-center gap-4">
    <!-- Same left edge and width as the cover below, so the hover background lines up with it -->
    <Button href="/playlist" variant="ghost" class="w-24 gap-1 px-0 text-muted-foreground">
      <MaterialSymbolsArrowBack class="h-4 w-4" aria-hidden="true" />
      Playlists
    </Button>
    {#if data.user}
      <UserMenu user={data.user} avatarUrl={data.avatarUrl} class="ml-auto" />
    {/if}
  </div>

  <!-- Playlist header -->
  <div class="flex items-end gap-4">
    <Icon src={current_playlist.images[0]?.url} size="large" class="rounded-md shadow-sm" />
    <div class="flex min-w-0 flex-col gap-1">
      <h1 class="truncate text-2xl font-bold tracking-tight sm:text-3xl">
        {current_playlist.name}
      </h1>
      {#if current_playlist.description}
        <p class="truncate text-sm text-muted-foreground">
          {@html current_playlist.description}
        </p>
      {/if}
      <p class="text-sm text-muted-foreground">
        {current_playlist.owner.display_name} · {data.tracks.length} tracks
      </p>
    </div>
  </div>

  <!-- Toolbar -->
  <!-- -mr-3 pr-3: the border runs past the content on the right as far as the track list's gutter does on the left -->
  <div class="-mr-3 mt-4 flex flex-wrap items-center gap-2 border-b pb-3 pr-3">
    <!-- Same width as the cover above (Icon "large" is 6em of the 16px header text = 6rem) -->
    <Button variant="outline" on:click={shuffleHandler} class="w-24 gap-2 px-0">
      <MaterialSymbolsShuffle class="h-4 w-4" aria-hidden="true" />
      Shuffle
    </Button>

    <DropdownMenu.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild let:builder={tooltipBuilder}>
          <DropdownMenu.Trigger asChild let:builder={menuBuilder}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More actions"
              builders={[tooltipBuilder, menuBuilder]}
            >
              <MaterialSymbolsMoreHoriz class="h-5 w-5" aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>More actions</Tooltip.Content>
      </Tooltip.Root>
      <DropdownMenu.Content align="start">
        <DropdownMenu.Item on:click={resetHandler} disabled={isLoadedOrder}>
          <MaterialSymbolsRestartAlt class="mr-2 h-4 w-4" aria-hidden="true" />
          Reset to original order
        </DropdownMenu.Item>
        <DropdownMenu.Item on:click={reverseHandler}>
          <MaterialSymbolsSwapVert class="mr-2 h-4 w-4" aria-hidden="true" />
          Reverse order
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item on:click={() => (clearGroupsDialogOpen = true)} disabled={groupCount === 0}>
          <MaterialSymbolsLinkOff class="mr-2 h-4 w-4" aria-hidden="true" />
          Clear all groups
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <AlertDialog.Root bind:open={clearGroupsDialogOpen}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Clear all groups?</AlertDialog.Title>
          <AlertDialog.Description>
            This ungroups {groupCount === 1 ? "1 group" : `all ${groupCount} groups`} in this playlist. The track order stays the same.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action on:click={() => trackList.clearGroups()}>Clear groups</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>

    <div class="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
      <TargetPickerDialog
        targets={valid_targets}
        currentId={current_playlist.id}
        bind:selected={target_playlist}
      />

      <AlertDialog.Root bind:open={commitDialogOpen}>
        <AlertDialog.Trigger asChild let:builder>
          <Button
            builders={[builder]}
            disabled={target_playlist === undefined || committing}
            aria-describedby={commitDisabledReason ? "commit-disabled-reason" : undefined}
            class="max-w-[16rem] gap-2"
          >
            {#if isDirty}
              <span class="h-2 w-2 shrink-0 rounded-full bg-primary-foreground" aria-hidden="true"></span>
              <span class="sr-only">Uncommitted changes.</span>
            {/if}
            <span class="truncate">
              {#if committing}
                Committing…
              {:else if target_playlist && target_playlist.id !== current_playlist.id}
                Commit to {target_playlist.name}
              {:else}
                Commit
              {/if}
            </span>
          </Button>
        </AlertDialog.Trigger>
        {#if target_playlist}
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Commit to "{target_playlist.name}"?</AlertDialog.Title>
              <AlertDialog.Description>
                This replaces the tracks in "{target_playlist.name}" with the current order.
                {#if data.tracks.length > 100}
                  Only the first 100 of {data.tracks.length} tracks will be committed.
                {/if}
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={committing}>Cancel</AlertDialog.Cancel>
              <!-- Plain button so the dialog stays open while the request runs -->
              <Button on:click={commit} disabled={committing}>
                {committing ? "Committing…" : "Commit"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        {/if}
      </AlertDialog.Root>
    </div>

    {#if commitDisabledReason}
      <p id="commit-disabled-reason" class="w-full text-right text-sm text-muted-foreground">
        {commitDisabledReason}
      </p>
    {/if}
  </div>

  <!-- Table header -->
  <div
    class="-mr-3 grid grid-cols-[3.5rem_1fr_2.2rem_15px] gap-3 pl-3 pr-3 border-b py-2 text-sm text-muted-foreground sm:grid-cols-[3.5rem_1fr_1fr_3rem_2.2rem_15px]"
  >
    <span class="flex justify-end">#</span>
    {#each sortableColumns as column}
      <button
        on:click={() => onColumnClicked(column)}
        class="flex items-center gap-1 justify-self-start rounded-sm hover:text-foreground {column === 'Album'
          ? 'hidden sm:flex'
          : ''}"
      >
        <span>{column}</span>
        <span class="sr-only">, {sortDescription(column, sortState)}</span>
        <span class="h-4 w-4" aria-hidden="true">
          {#if sortState.column === column}
            {#if sortState.direction === SortDirection.Ascending}
              <MaterialSymbolsKeyboardArrowUp class="h-4 w-4" />
            {:else if sortState.direction === SortDirection.Descending}
              <MaterialSymbolsKeyboardArrowDown class="h-4 w-4" />
            {/if}
          {/if}
        </span>
      </button>
    {/each}
    <div class="hidden items-center justify-end sm:flex">
      <MaterialSymbolsNestClockFarsightAnalogOutline class="h-4 w-4" aria-label="Duration" />
    </div>
  </div>

  <div class="relative min-h-0 flex-1 border-b">
    <TrackList
      bind:this={trackList}
      bind:tracks={data.tracks}
      bind:selectedCount
      bind:canGroup
      bind:canUngroup
      bind:groups
      on:move={adoptCurrentOrder}
      on:groupschange={onGroupsChange}
      bottomInset={selectedCount >= 2 ? 56 : 0}
    />
    <!-- Floats over the bottom of the track list, which leaves room to scroll its last rows clear of it -->
    <div class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
      {#if selectedCount >= 2}
        <div
          role="toolbar"
          aria-label="Selection"
          class="pointer-events-auto flex items-center gap-1 rounded-md border bg-popover p-0.5 pl-4 text-popover-foreground shadow-md"
        >
          <span class="mr-2 text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button
            variant="ghost"
            size="sm"
            class="gap-2"
            disabled={!canGroup}
            aria-keyshortcuts="G"
            on:click={() => trackList.groupSelection()}
          >
            <MaterialSymbolsLink class="h-4 w-4" aria-hidden="true" />
            Group
          </Button>
          {#if canUngroup}
            <Button
              variant="ghost"
              size="sm"
              class="gap-2"
              aria-keyshortcuts="Shift+G"
              on:click={() => trackList.ungroupSelection()}
            >
              <MaterialSymbolsLinkOff class="h-4 w-4" aria-hidden="true" />
              Ungroup
            </Button>
          {/if}
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            aria-label="Clear selection"
            on:click={() => trackList.clearSelectionFromToolbar()}
          >
            <MaterialSymbolsClose class="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>
