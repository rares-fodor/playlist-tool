<script lang="ts">
    import Icon from "$lib/components/Icon.svelte";

    import type { TrackItem } from '$lib/api_types'

    export let track: TrackItem;

    let name = track.name;
    let artists = track.artists;
    let album = track.album;

    // Spotify states the url field is not nullable but some albums DO have missing album covers
    let imageUrl = album.images[0]?.url ?? `https://placehold.co/300?text=${album.name.at(0)}`;

</script>

<div class="grid grid-cols-2 border-b border-b-gray-400 py-1">
    <div class="flex min-w-0 items-center max-h-9 gap-2">
        <Icon size="medium" src={imageUrl}/>
        <div class="flex flex-col justify-center whitespace-nowrap overflow-hidden">
            <section class="overflow-hidden overflow-ellipsis text-base/tight">{name}</section>
            <section class="overflow-hidden overflow-ellipsis text-sm/tight">{artists[0].name}</section>
        </div>
    </div>
    <div class="flex items-center text-sm overflow-hidden whitespace-nowrap overflow-ellipsis">
        {album.name}
    </div>
</div>

