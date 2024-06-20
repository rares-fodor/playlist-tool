<script lang="ts">
    import TrackList from './TrackList.svelte';
    import Icon from '$lib/components/Icon.svelte';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';
    import * as Card from '$lib/components/ui/card';
    import { ScrollArea } from '$lib/components/ui/scroll-area';
    import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down';
    import MaterialSymbolsKeyboardArrowUp from '~icons/material-symbols/keyboard-arrow-up';
    import MaterialSymbolsMoreHoriz from '~icons/material-symbols/more-horiz'
    import MaterialSymbolsShuffle from '~icons/material-symbols/shuffle'
    import MaterialSymbolsCheckCircle from '~icons/material-symbols/check-circle'

    import type { PageData } from "./$types";
    import type { Playlist } from '$lib/api_types';
    import Button from '$lib/components/ui/button/button.svelte';

    export let data: PageData;

    enum SortDirection {
        None = 0,
        Ascending = 1,
        Descending = -1,
    }

    // Update both when expanding to more/other columns
    // NOTE: Should be refactored, these values are used as both the button text and css Subclass
    type SortBy = 'Custom' | 'Title' | 'Album';
    // Allow each block to infer type correctly (skip 'custom', we don't need a button for it)
    const sortableColumns: SortBy[] = ['Title', 'Album'];

    interface SortState {
        column: SortBy,
        direction: SortDirection,
    }
    let sortState: SortState = {
        column: 'Custom',
        direction: SortDirection.None,
    }

    // Manual sort order, saved when sorting by table header (title/album)
    let user_order = [...data.tracks];

    // Playlist data
    let current_playlist = data.playlists.find(e => e.id === data.id)!;
    let target_playlist: Playlist | undefined;

    const playlistTooLarge = (playlist: Playlist) => {
        return playlist.tracks.total > 100;
    }
    const playlistNotOnwned = (playlist: Playlist) => {
        return playlist.owner.id !== data.user?.spotify_id;
    }
    const playlistCollaborative = (playlist: Playlist) => {
        return playlist.collaborative;
    }

    const canCommit = (playlist: Playlist) => {
        return !playlistTooLarge(playlist) &&
            !playlistNotOnwned(playlist) &&
            !playlistCollaborative(playlist)
    }

    $: isCommitDisabled = !canCommit(current_playlist) && target_playlist === undefined;
    $: commitDialogText = (() => {
        if (isCommitDisabled) {
            if (playlistNotOnwned(current_playlist)) {
                return "Cannot commit changes, you are not the playlist owner!";
            } else if (playlistTooLarge(current_playlist)) {
                return "This playlist is too long (> 100 tracks) to commit to, choose a target instead!";
            } else if (playlistCollaborative(current_playlist)) {
                return "Cannot commit changes, this playlist is collaborative!";
            }
            return "Cannot commit changes!";
        }
        return "Are you sure you want to commit these changes?";
    })()

    const valid_targets = data.playlists.filter(canCommit);

    // Durstenfeld shuffle
    // Modifies data.tracks in place, triggers an update for the track list view and the URI array
    function shuffleHandler() {
        for (let i = data.tracks.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let aux = data.tracks[i];
            data.tracks[i] = data.tracks[j];
            data.tracks[j] = aux;
        }
    }

    // Send URI array to back-end to be commited to Spotify
    async function commit() {
        let playlist_order = data.tracks.map(e => e.track.uri);

        const response = await fetch("/api/commit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: target_playlist?.id ?? current_playlist.id,
                state: playlist_order.slice(0, 100),
            }),
        });
        const reply = await response.json();
        console.log(reply);
    }

    function onTargetSelected(playlist: Playlist) {
        if (target_playlist === playlist) {
            target_playlist = undefined;
            return;
        }
        target_playlist = playlist;
    }

    function onTargetRemoved() {
        target_playlist = undefined;
    }

    function sortTracks(column: SortBy, direction: SortDirection) {
        if (column === 'Title') {
            data.tracks = data.tracks.sort((a, b) => direction * a.track.name.localeCompare(b.track.name));
        } else if (column === 'Album') {
            data.tracks = data.tracks.sort((a, b) => direction * a.track.album.name.localeCompare(b.track.album.name));
        }
    }

    function onColumnClicked(column: SortBy) {
        if (sortState.column === 'Custom' && sortState.direction === SortDirection.None) {
            user_order = [...data.tracks];
        }

        if (sortState.column === column) {
            sortState.direction = (sortState.direction + 2) % 3 - 1;
        } else {
            sortState.column = column;
            sortState.direction = SortDirection.Ascending;
        }

        if (sortState.direction === SortDirection.None) {
            data.tracks = [...user_order];
            sortState.column = 'Custom';
        } else {
            sortTracks(column, sortState.direction);
        }
    }

</script>

<!-- Playlist greeter -->
<div class="flex flex-col my-8">
    <!-- Playlist title card -->
    <div class={`flex items-end gap-3`}>
        <Icon src={current_playlist.images[0].url} size="large" />
        <div class="flex flex-col overflow-hidden max-h-24">
            <span
                class="inline-block overflow-hidden font-semibold text-3xl/tight"
            >
                {current_playlist.name}
            </span>
            <span
                class="inline-block text-gray-800 overflow-hidden whitespace-nowrap overflow-ellipsis text-base/tight"
            >
                {@html current_playlist.description}
            </span>
        </div>
    </div>
    <div class="flex flex-row items-center gap-1 mt-3 pt-3 border-t border-t-black">
        <!-- Shuffle -->
        <Button
            variant="ghost"
            size="icon"
            on:click={shuffleHandler}
        >
            <MaterialSymbolsShuffle style="width: 2em; height: 2em;" />
        </Button>

        <!-- More -->
        <Button
            variant="ghost"
            size="icon"
        >
            <MaterialSymbolsMoreHoriz style="width: 2em; height: 2em;" />
        </Button>

        <!-- Commit -->
        <div class="flex ml-auto gap-2">
            <div class="border-b border-black hover:bg-gray-200 p-1">
                <Dialog.Root>
                    {#if target_playlist === undefined}
                        <Dialog.Trigger>Click to choose target playlist</Dialog.Trigger>
                    {:else}
                        <Dialog.Trigger>
                            <div class="flex items-center gap-2 p-1">
                                <Icon size="medium" src={target_playlist.images[0].url}/>
                                <span>{target_playlist.name}</span>
                            </div> 
                        </Dialog.Trigger>
                    {/if}
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Choose a target</Dialog.Title>
                            <Dialog.Description>Changes made will be commited to the target playlist</Dialog.Description>
                        </Dialog.Header>
                        <ScrollArea>
                            <div class="flex flex-col gap-1 max-h-[350px]">
                                {#each valid_targets as target}
                                    <button
                                        on:click={() => onTargetSelected(target)}
                                        class={`${target === target_playlist ? 'bg-green-200' : 'hover:bg-gray-200'}`}
                                    >
                                        <div class="flex items-center gap-2 p-1">
                                            <Icon size="medium" src={target.images[0].url}/>
                                            <span>{target.name}</span>
                                        </div> 
                                    </button>
                                {/each}
                            </div>
                        </ScrollArea>
                        <Dialog.Footer>
                            <Dialog.Close>Ok</Dialog.Close>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Root>
            </div>
            <AlertDialog.Root>
                <AlertDialog.Trigger>
                    <MaterialSymbolsCheckCircle
                        style="width: 2em; height: 2em;"
                        class={`text-gray-700 ${isCommitDisabled ? 'hover:text-red-600' : 'hover:text-green-600'}`}
                    />
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                    <AlertDialog.Header>
                        {#if isCommitDisabled }
                            <AlertDialog.Title>Commit not allowed</AlertDialog.Title>
                        {:else}
                            <AlertDialog.Title>Are you sure?</AlertDialog.Title>
                        {/if}
                        <AlertDialog.Description>{commitDialogText}</AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                        {#if isCommitDisabled }
                            <AlertDialog.Cancel>Ok</AlertDialog.Cancel>
                        {:else}
                            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                            <AlertDialog.Action on:click={commit}>Ok</AlertDialog.Action>
                        {/if}
                    </AlertDialog.Footer>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </div>
    </div>
</div>


<div class="flex flex-col">
    <!-- Table header -->
    <div class="grid grid-cols-[1fr_1fr_2rem] border-b border-b-gray-400 py-1">
    {#each sortableColumns as column}
        <button on:click={() => onColumnClicked(column)}>
            <div class={`flex items-center gap-1 ${column === "Title" ? 'pl-10' : ''}`}> <!-- NOTE very hacky --->
                <span>{column}</span>
                <div class="w-4 h-4">
                    {#if sortState.column === column}
                        {#if sortState.direction === SortDirection.Ascending}
                            <MaterialSymbolsKeyboardArrowUp viewBox="0 0 25 25" style="width: 1em; height: 1em;"/>
                        {:else if sortState.direction === SortDirection.Descending}
                            <MaterialSymbolsKeyboardArrowDown viewBox="0 0 25 25" style="width: 1em; height: 1em;"/>
                        {/if}
                    {/if}
                </div>
            </div>
        </button>
    {/each}
    </div>

    <TrackList
        bind:tracks={data.tracks}
    />
</div>

