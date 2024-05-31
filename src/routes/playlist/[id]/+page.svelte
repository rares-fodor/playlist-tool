<script lang="ts">
    import SortableList from '$lib/components/SortableList.svelte'
    import TableRow from '../TableRow.svelte';
    import Track from './Track.svelte';
    import Icon from '$lib/components/Icon.svelte';
    import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down';
    import MaterialSymbolsKeyboardArrowUp from '~icons/material-symbols/keyboard-arrow-up';

    import type { PageData } from "./$types";
    import type { SortableEvent } from 'sortablejs';
    import type { Playlist } from '$lib/api_types';

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
        if (isCommitDisabled) {
            if (playlistNotOnwned(current_playlist)) {
                alert("Cannot commit changes, you are not the playlist owner!");
            } else if (playlistTooLarge(current_playlist)) {
                alert("This playlist is too long (> 100 tracks) to commit to, choose a target instead!");
            } else if (playlistCollaborative(current_playlist)) {
                alert("Cannot commit changes, this playlist is collaborative!");
            }
            return;
        }

        const confirmed = confirm(`Commit these changes to ${target_playlist?.name ?? current_playlist.name}?`);
        if (confirmed) {
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
    }

    // Executes when drag & drop event ends
    function onEndHandler(event: CustomEvent<SortableEvent>) {
        let old_idx = event.detail.oldIndex;
        let new_idx = event.detail.newIndex;
        if (old_idx === undefined || new_idx === undefined) {
            return;
        }
        const elem = data.tracks[old_idx];
        data.tracks.splice(old_idx, 1);
        data.tracks.splice(new_idx, 0, elem);
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


</script>


<!-- Title buttons -->
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr">
    <div class="title-buttons">
        <button on:click={() => {}}>Log order</button>
        <button on:click={shuffleHandler}>Shuffle</button>
    </div>
    <div style="display: flex; justify-content: center; gap: 5px">
        <div class="dropdown">
            {#if target_playlist === undefined}
                <button>Select target</button>
            {:else}
                <button class="dropdown-item">
                    <Icon src={target_playlist.images[0].url} size="small" />
                    <span>{target_playlist.name}</span>
                </button>
            {/if}
            <div class="dropdown-content">
                <button class="dropdown-item" on:click={() => onTargetRemoved()}>--- Remove selection ---</button>
                {#each valid_targets as playlist}
                    {#if playlist.id !== current_playlist.id }
                        <button class="dropdown-item" on:click={() => onTargetSelected(playlist)}>
                            <Icon src={playlist.images[0].url} size="small" />
                            <span>{playlist.name}</span>
                        </button>
                    {/if}
                {/each}
            </div>
        </div>
        {#if target_playlist !== undefined}
            <a data-sveltekit-reload href={`/playlist/${target_playlist.id}`}>Go to target</a>
        {/if}
    </div>

    <button style="margin-left: auto;" class:disabled-button={isCommitDisabled} on:click={commit}>Commit</button>

</div>

<div class="playlist-greeter">
    <Icon src={current_playlist.images[0].url} size="large" />
    <div class="playlist-title">
        <span class="playlist-title title">{current_playlist.name}</span>
        <span class="playlist-title desc">{@html current_playlist.description}</span>
    </div>
</div>

<!-- Table header -->
<TableRow --col-count="2">
{#each sortableColumns as column}
    <button class="text" on:click={() => onColumnClicked(column)}>
        <div class={`table-header ${column}`}>
            <span>{column}</span>
            <div class="svg-container">
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
</TableRow>


<SortableList on:onEnd={onEndHandler} class="list" animation={150}>
<!-- Might be optimized -->
{#key data.tracks}
{#each data.tracks as pl_track}
    <Track track={pl_track.track}/>
{/each}
{/key}
</SortableList>


<style>
    .title-buttons {
        display: flex;
        align-items: flex-start;
        gap: 5px;
    }
    .table-header {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .table-header.Title {
        padding-left: calc(2em + 10px);
    }
    .svg-container {
        width: 1em;
        height: 1em;
    }

    .playlist-greeter {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        padding-top: 30px;
        padding-bottom: 30px;
    }
    .playlist-title {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        max-height: 6em;
        flex-grow: 1;
        overflow: hidden;
    }
    .playlist-title.title {
        display: inline-block;
        flex-grow: 1;
        font-weight: 600;
        font-size: 2em;
    }
    .playlist-title.desc {
        display: inline-block;
        flex-shrink: 0;
        color: var(--off-text-col);
        min-height: 1em;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .playlist-title.desc:empty {
        display: none;
    }

    .dropdown {
        display: inline-block;
        background-color: var(--accent-bg-color);
    }
    .dropdown-content {
        display: none;
        position: absolute;
        background-color: var(--accent-bg-color);
        max-height: 600px;
        overflow-y: scroll;
        overscroll-behavior: contain;
    }
    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 5px;
        max-width: 400px;
        min-height: calc(1em + 5px);
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dropdown:hover .dropdown-content {
        display: block;
    }
    .dropdown-item:hover {
        background-color: var(--hover-bg-color);
    }

    .disabled-button {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 450px) {
        .playlist-title.title {
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    }
</style>
