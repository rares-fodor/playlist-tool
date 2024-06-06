<script lang="ts">
    import TrackList from './TrackList.svelte';
    import ConfirmModal from '$lib/components/modal/ConfirmModal.svelte';
    import Icon from '$lib/components/Icon.svelte';
    import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down';
    import MaterialSymbolsKeyboardArrowUp from '~icons/material-symbols/keyboard-arrow-up';

    import type { PageData } from "./$types";
    import type { Playlist } from '$lib/api_types';


    import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
    import { onMount } from 'svelte';

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

    let showCommitModal: boolean = false;


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

    // Executes when drag & drop event ends
    function onEndHandler(event: CustomEvent<{ oldIndex: number | undefined, newIndex: number | undefined }>) {
        let old_idx = event.detail.oldIndex;
        let new_idx = event.detail.newIndex;

        if (old_idx === undefined || new_idx === undefined) {
            return;
        }

        const elem = data.tracks[old_idx];
        data.tracks.splice(old_idx, 1);
        data.tracks.splice(new_idx, 0, elem);
        data.tracks = data.tracks;
    }

    function onTargetSelected(playlist: Playlist) {
        console.log(playlist.name);
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

    let sortingEnabled: boolean = true;
    $: sortToggleClass = `${sortingEnabled ? 'bg-green-200 hover:bg-green-300' : 'bg-red-200 hover:bg-red-300'}`

    let dragTitle: HTMLElement;

    onMount(() => {
        return draggable({
            element: dragTitle
        })
    })

</script>


<!-- Title buttons -->
<div class="grid grid-cols-3">
    <div class="flex gap-2">
        <button class="p-1 bg-gray-200 hover:bg-gray-300" on:click={() => {}}>Log order</button>
        <button class="p-1 bg-gray-200 hover:bg-gray-300" on:click={shuffleHandler}>Shuffle</button>
        <button class={`p-1 ${sortToggleClass}`} on:click={() => sortingEnabled = !sortingEnabled}>{sortingEnabled ? 'Sortable' : 'Fixed'}</button>
    </div>
    <div class="flex justify-center gap-2">
        <!-- Dropdown handle -->
        <div class="inline-block bg-gray-200 group">
            {#if target_playlist === undefined}
                <button class="p-1">Select target</button>
            {:else}
                <button class="p-1 hover:bg-gray-300 flex items-center gap-1 max-w-96 min-h-5 w-full whitespace-nowrap overflow-hidden overflow-ellipsis">
                    <Icon src={target_playlist.images[0].url} size="small" />
                    <span>{target_playlist.name}</span>
                </button>
            {/if}
            <!-- Dropdown content --->
            <div
                class="hidden group-hover:block absolute bg-gray-200 max-h-[600px] overflow-y-scroll overscroll-contain z-20"
            >
                <button
                    class="p-1 hover:bg-gray-300 flex items-center gap-1 max-w-96 min-h-5 w-full whitespace-nowrap overflow-hidden overflow-ellipsis"
                    on:click={() => onTargetRemoved()}
                >
                    --- Remove selection ---
                </button>
                {#each valid_targets as playlist}
                    {#if playlist.id !== current_playlist.id }
                        <button
                            class="p-1 hover:bg-gray-300 flex items-center gap-1 max-w-96 min-h-5 w-full whitespace-nowrap overflow-hidden overflow-ellipsis"
                            on:click={() => onTargetSelected(playlist)}
                        >
                            <Icon src={playlist.images[0].url} size="small" />
                            <span>{playlist.name}</span>
                        </button>
                    {/if}
                {/each}
            </div>
        </div>
        {#if target_playlist !== undefined}
            <a data-sveltekit-reload href={`/playlist/${target_playlist.id}`} class="p-1 bg-gray-200 hover:bg-gray-300">Go to target</a>
        {/if}
    </div>

    <button
        style="margin-left: auto;"
        class={`${isCommitDisabled ? 'opacity-50 cursor-not-allowed' : ''} p-1 bg-gray-200 hover:bg-gray-300`}
        on:click={() => showCommitModal = true}
    >
        Commit
    </button>
    <ConfirmModal
        on:confirm={commit}
        bind:showModal={showCommitModal}
        question={commitDialogText}
        confirmMessage="Changes committed succesfully"
    /> <!-- TODO change confirm message with commit response -->

</div>

<!-- Playlist greeter -->
<div class="flex items-end py-8 gap-3">
    <Icon src={current_playlist.images[0].url} size="large" />
    <div class="flex flex-col overflow-hidden grow max-h-24">
        <span
            bind:this={dragTitle}
            class="inline-block grow overflow-hidden font-semibold text-3xl/tight"
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

<!-- Table header -->
<div class="grid grid-cols-[1fr_1fr_2rem] border-b border-b-gray-700 py-1">
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
    tracks={data.tracks}
    sortingEnabled={sortingEnabled}
    on:endDrag={onEndHandler}
/>

