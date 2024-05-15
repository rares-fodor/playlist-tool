<script lang="ts">
    import SortableList from '$lib/components/SortableList.svelte'
    import Track from './Track.svelte'

    import type { PageData } from "./$types";
    import type { SortableEvent } from 'sortablejs';


    export let data: PageData;

    let playlist_name = data.playlists?.find(e => e.id === data.id)?.name;


    function onEndHandler(event: CustomEvent<SortableEvent>) {
        console.log(event.detail.to);
    }

</script>

<h1>{playlist_name}</h1>


<SortableList on:onEnd={onEndHandler} class="list">
{#each data.tracks as {track}}
    <Track name={track.name} artists={track.artists} album={track.album}/>
{/each}
</SortableList>


<style>
</style>
