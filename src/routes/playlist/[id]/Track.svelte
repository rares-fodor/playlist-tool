<script lang="ts">
    import type { TrackItem } from '$lib/api_types.ts'

    export let track: TrackItem;

    let name = track.name;
    let artists = track.artists;
    let album = track.album;
    let image = album.images[0];

</script>


<div class="root">
<div class="track-entry">
    <div class="image">
        <img src={image.url} alt="img">
    </div>
    <div class="title">
        <section class="track-name">{name}</section>
        <section class="artists-name">{artists[0].name}</section>
    </div>
    <div class="album">
        {album.name}
    </div>
</div>
</div>

<style>
    .root {
        border-bottom: 1px solid grey;
        padding: 0.2em 0;
    }
    .track-entry {
        display: grid;
        grid-template-columns: 2em repeat(auto-fit, minmax(200px, 1fr)); /* TODO: remove hardcoded image col width */
        gap: 10px;
    }
    .title {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        white-space: nowrap;
    }
    .track-name {
        color: var(--main-text-col);
        text-overflow: ellipsis;
        overflow: hidden;
    }
    .artists-name {
        color: var(--off-text-col);
        font-size: .85em;
        text-overflow: ellipsis;
    }
    .album {
        display: flex;
        align-items: center;
        color: var(--off-text-col);
        font-size: .95em;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }
    img {
        width: 2em;
        height: 2em;
    }
    .image {
        display: flex;
        align-items: center;
    }

</style>

