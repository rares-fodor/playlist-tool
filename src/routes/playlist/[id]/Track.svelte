<script lang="ts">
    import TableRow from "../TableRow.svelte";
    import RowIcon from "$lib/components/RowIcon.svelte";

    import type { TrackItem } from '$lib/api_types'

    export let track: TrackItem;

    let name = track.name;
    let artists = track.artists;
    let album = track.album;
    let image = album.images[0];

</script>

<div> <!-- SortableJS doesn't play nice with --style-prop used below -->
<TableRow --col-count="2">
    <svelte:fragment>
        <div class="title">
            <RowIcon src={image.url}/>
            <div class="label">
                <section class="track-name">{name}</section>
                <section class="artists-name">{artists[0].name}</section>
            </div>
        </div>
        <div class="album">
            {album.name}
        </div>
    </svelte:fragment>
</TableRow>
</div>


<style>
    .title {
        display: flex;
        gap: 10px;
    }
    .label {
        display: flex;
        flex-direction: column;
        max-height: 2em;
        justify-content: flex-start;
        white-space: nowrap;
        overflow: hidden;
    }
    .track-name {
        color: var(--main-text-col);
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .artists-name {
        color: var(--off-text-col);
        font-size: .85em;
        overflow: hidden;
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
</style>

