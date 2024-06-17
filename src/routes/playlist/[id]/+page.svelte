<script lang="ts">
    import TrackList from './TrackList.svelte';
    import ConfirmModal from '$lib/components/modal/ConfirmModal.svelte';
    import Button from '$lib/components/Button.svelte';
    import Icon from '$lib/components/Icon.svelte';
    import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down';
    import MaterialSymbolsKeyboardArrowUp from '~icons/material-symbols/keyboard-arrow-up';
    import MaterialSymbolsMoreHoriz from '~icons/material-symbols/more-horiz'
    import MaterialSymbolsShuffle from '~icons/material-symbols/shuffle'
    import MaterialSymbolsCheckCircle from '~icons/material-symbols/check-circle'

    import type { PageData } from "./$types";
    import type { Playlist } from '$lib/api_types';
    import Modal from '$lib/components/modal/Modal.svelte';

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
    let showTargetSelectModal: boolean = false;

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
        console.log(`Target selected: ${playlist.name}`);
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
        <button
            on:click={shuffleHandler}
        >
            <MaterialSymbolsShuffle
                style="width: 2em; height: 2em;"
                class="text-gray-700 hover:text-black"
            />
        </button>

        <!-- More -->
        <MaterialSymbolsMoreHoriz
            style="width: 2em; height: 2em;"
            class="text-gray-700 hover:text-black"
        />

        <!-- Commit -->
        <div class="flex ml-auto gap-2">
            <div class="border-b border-black hover:bg-gray-200 h-9 p-1">
                <button
                    on:click={() => showTargetSelectModal = true}
                >
                    {#if target_playlist === undefined}
                        Click here to select a target
                    {:else}
                        <div class="flex items-center gap-2">
                            <Icon size="medium" src={target_playlist.images[0].url} />
                            <span>{target_playlist.name}</span>
                        </div>
                    {/if}
                </button>
            </div>
            <button
                on:click={() => showCommitModal = true}
                class={`${isCommitDisabled ? 'cursor-not-allowed' : ''}`}
            >
                <MaterialSymbolsCheckCircle
                    style="width: 2em; height: 2em;"
                    class={`text-gray-700 ${isCommitDisabled ? 'hover:text-red-600' : 'hover:text-green-600'}`}
                />
            </button>

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

{#if showCommitModal}
    <ConfirmModal
        on:confirm={commit}
        bind:showModal={showCommitModal}
        question={commitDialogText}
        confirmMessage="Changes committed succesfully"
    /> <!-- TODO change confirm message with commit response -->
{/if}
{#if showTargetSelectModal}
    <Modal
        bind:showModal={showTargetSelectModal}
    >
        <div slot="body" class="flex flex-col gap-1 overflow-auto max-h-[200px]">
            {#each valid_targets as target}
                <button
                    on:click={() => onTargetSelected(target)}
                >
                    <div class="flex items-center gap-1 max-h-4 py-3 shrink-0 hover:bg-gray-200 overflow-hidden overflow-ellipsis whitespace-nowrap">
                        <Icon size="small" src={target.images[0].url} />
                        <span>{target.name}</span>
                    </div>
                </button>
            {/each}
        </div>
    </Modal>
{/if}
