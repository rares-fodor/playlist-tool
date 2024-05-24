<script lang="ts">
    import SortableList from '$lib/components/SortableList.svelte'
    import TableRow from '../TableRow.svelte';
    import Track from './Track.svelte';
    import RowIcon from '$lib/components/RowIcon.svelte';
    import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down';
    import MaterialSymbolsKeyboardArrowUp from '~icons/material-symbols/keyboard-arrow-up';

    import type { PageData } from "./$types";
    import type { SortableEvent } from 'sortablejs';
    import type { Playlist, PlaylistedTrack } from '$lib/api_types';

    export let data: PageData;

    enum Sorted {
        Ascending,
        Descending,
        None
    }

    let title_sorted: Sorted = Sorted.None;
    let album_sorted: Sorted = Sorted.None;
    let target_playlist: Playlist | undefined;

    let user_order = [...data.tracks];

    // Playlist data
    let current_playlist = data.playlists?.find(e => e.id === data.id);

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
        const confirmed = confirm("Commit these changes?");

        if (confirmed) {
            let offset = 0;
            let playlist_order = data.tracks.map(e => e.track.uri);

            while (playlist_order.length - offset > 0) {
                const response = await fetch("/api/commit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: data.id,
                        offset: offset,
                        state: playlist_order.slice(offset, Math.min(offset + 100, playlist_order.length - offset))
                    }),
                });
                const reply = await response.json();
                console.log(reply);
                offset += 100;
            }
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

    function onTitleClicked() {
        album_sorted = Sorted.None;
        if (title_sorted.valueOf() === Sorted.None) {
            // Save user order to restore when reverting sort
            user_order = [...data.tracks];
            title_sorted = Sorted.Ascending;
            data.tracks = data.tracks.sort((a, b) => a.track.name.localeCompare(b.track.name))
        } else if (title_sorted.valueOf() === Sorted.Ascending) {
            title_sorted = Sorted.Descending;
            data.tracks = data.tracks.reverse();
        } else {
            title_sorted = Sorted.None;
            data.tracks = [...user_order]
        }
    }

    function onAlbumClicked() {
        title_sorted = Sorted.None;
        if (album_sorted.valueOf() === Sorted.None) {
            // Save user order to restore when reverting sort
            user_order = [...data.tracks];
            album_sorted = Sorted.Ascending;
            data.tracks = data.tracks.sort((a, b) => a.track.album.name.localeCompare(b.track.album.name))
        } else if (album_sorted.valueOf() === Sorted.Ascending) {
            album_sorted = Sorted.Descending;
            data.tracks = data.tracks.reverse();
        } else {
            album_sorted = Sorted.None;
            data.tracks = [...user_order]
        }
    }

</script>


<!-- Title buttons -->
<div class="title-buttons">
    <button on:click={() => {console.log(user_order.map(e => e.track.name))}}>Log order</button>
    <button on:click={shuffleHandler}>Shuffle</button>
    <button on:click={commit}>Commit</button>

    <div class="dropdown">
        {#if target_playlist === undefined}
            <button>Select target</button>
        {:else}
            <button class="dropdown-item">
                <RowIcon src={target_playlist.images[0].url} size="1em" />
                <span>{target_playlist.name}</span>
            </button>
        {/if}
        <div class="dropdown-content">
            {#each data.playlists as playlist}
                {#if playlist.id !== current_playlist?.id }
                    <button class="dropdown-item" on:click={() => onTargetSelected(playlist)}>
                        <RowIcon src={playlist.images[0].url} size="1em" />
                        <span>{playlist.name}</span>
                    </button>
                {/if}
            {/each}
        </div>
    </div>
</div>

<div class="playlist-greeter">
    <img class="playlist-icon" src={current_playlist?.images[0].url} alt="playlist">
    <div class="playlist-title">
        <span class="playlist-title title">{current_playlist?.name}</span>
        <span class="playlist-title desc">{@html current_playlist?.description}</span>
    </div>
</div>

<!-- Table header -->
<TableRow --col-count="2">
    <button class="text" on:click={onTitleClicked}>
        <div class="table-header title">
            <span>Title</span>
            <div class="svg-container">
                {#if title_sorted.valueOf() === Sorted.Ascending}
                    <MaterialSymbolsKeyboardArrowUp viewBox="0 0 25 25" style="width: 1em; height: 1em;"/>
                {:else if title_sorted.valueOf() === Sorted.Descending}
                    <MaterialSymbolsKeyboardArrowDown viewBox="0 0 25 25" style="width: 1em; height: 1em;"/>
                {/if}
            </div>
        </div>
    </button>
    <button class="text" on:click={onAlbumClicked}>
        <div class="table-header album">
            <span>Album</span>
            <div class="svg-container">
                {#if album_sorted.valueOf() === Sorted.Ascending}
                <MaterialSymbolsKeyboardArrowUp viewBox="0 0 25 25" style="width: 1em; height: 1em;"/>
                {:else if album_sorted.valueOf() === Sorted.Descending}
                <MaterialSymbolsKeyboardArrowDown viewBox="0 0 25 25" style="width: 1em; height: 1em;"/>
                {/if}
            </div>
        </div>
    </button>
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
    .table-header.title {
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
    .playlist-icon {
        width: 6em;
        height: 6em;
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

    @media (max-width: 450px) {
        .playlist-title.title {
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    }
</style>
