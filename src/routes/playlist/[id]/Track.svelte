<script lang="ts">
    import Icon from "$lib/components/Icon.svelte";
    import TableRow from "../TableRow.svelte";

    import type { TrackItem } from '$lib/api_types'

    export let track: TrackItem;

    let name = track.name;
    let artists = track.artists;
    let album = track.album;

    // Spotify states the url field is not nullable but some albums DO have missing album covers
    let imageUrl = album.images[0]?.url ?? `https://placehold.co/300?text=${album.name.at(0)}`;

</script>

<div>
<TableRow --col-count="2">
    <svelte:fragment>
    <div class="title-group">
        <Icon size="medium" src={imageUrl}/>
        <div class="label">
            <section class="label-title">{name}</section>
            <section class="label-artist">{artists[0].name}</section>
        </div>
    </div>
    <div class="album">
        {album.name}
    </div>
    </svelte:fragment>
</TableRow>
</div>


<style>
    .title-group {
        display: flex;
        min-width: 0;
        align-items: center;
        max-height: 2em;
        gap: 10px;
    }
    .label {
        display: flex;
        flex-direction: column;
        justify-content: center;
        white-space: nowrap;
        overflow: hidden;
    }
    .label-title {
        color: var(--main-text-col);
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .label-artist {
        color: var(--secondary-font-color);
        overflow: hidden;
        font-size: 0.85em;
        text-overflow: ellipsis;
    }
    .album {
        display: flex;
        align-items: center;
        color: var(--secondary-font-color);
        font-size: .95em;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }
</style>

