<script lang="ts">
    import type { SimplifiedAlbum, SimplifiedArtist } from "$lib/api_types";

    export let name: string;
    export let artists: SimplifiedArtist[];
    export let album: SimplifiedAlbum;
</script>


<div>
{artists[0].name} - {name} ({album.name})<br>
</div>

<style>
    div {
        border-bottom: 1px solid grey;
        padding: 0.2em 0;
    }
</style>

