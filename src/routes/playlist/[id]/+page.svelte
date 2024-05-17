<script lang="ts">
    import SortableList from '$lib/components/SortableList.svelte'
    import Track from './Track.svelte'

    import type { PageData } from "./$types";
    import type { SortableEvent } from 'sortablejs';

    export let data: PageData;

    let playlist_name = data.playlists?.find(e => e.id === data.id)?.name;

    // Track URIs in the order they appear (or should) in the playlist
    $: playlist_order = data.tracks.map(e => e.track.uri);

    // Durstenfeld shuffle
    // Modifies data.tracks in place, triggers an update for the track list view and the URI array
    function shuffleHandler() {
        let array = data.tracks;
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let aux = array[i];
            array[i] = array[j];
            array[j] = aux;
        }
        // Force reactivity trigger (might seem redundant)
        data.tracks = array;
    }

    // Executes when drag & drop event ends
    function onEndHandler(event: CustomEvent<SortableEvent>) {
        let old_idx = event.detail.oldIndex;
        let new_idx = event.detail.newIndex;

        console.log(event.detail.to);

        if (new_idx === undefined || old_idx === undefined || new_idx === old_idx) {
            return;
        }

        let left_slice, right_slice, shifted_slice;
        let new_order: string[] = [];

        if (new_idx < old_idx) {
            left_slice    = playlist_order.slice(0, new_idx);
            right_slice   = playlist_order.slice(old_idx + 1, playlist_order.length);
            shifted_slice = playlist_order.slice(new_idx, old_idx);

            new_order = new_order.concat(left_slice, playlist_order[old_idx], shifted_slice, right_slice);
        }
        else if (new_idx > old_idx) {
            left_slice    = playlist_order.slice(0, old_idx);
            right_slice   = playlist_order.slice(new_idx + 1, playlist_order.length);
            shifted_slice = playlist_order.slice(old_idx + 1, new_idx + 1);

            new_order = new_order.concat(left_slice, shifted_slice, playlist_order[old_idx], right_slice);
        }

        playlist_order = new_order;
    }

    // Send URI array to back-end to be commited to Spotify
    async function commit() {
        // const confirmed = confirm("Commit these changes?");
        const confirmed = true;

        if (confirmed) {
            const response = await fetch("/api/commit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: data.id,
                    state: playlist_order
                }),
            });
            const reply = await response.json();
            console.log(reply);
        }
    }
</script>


<div>
    <button on:click={() => {console.log(playlist_order)}}>Log order</button>
    <button on:click={shuffleHandler}>Shuffle</button>
    <button on:click={commit}>Commit</button>
    <h2>{playlist_name}</h2>
</div>

<SortableList on:onEnd={onEndHandler} class="list" animation={200}>
{#each data.tracks as pl_track (pl_track.track.uri)}
    <Track track={pl_track.track}/>
{/each}
</SortableList>


<style>
</style>
