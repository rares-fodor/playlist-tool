<script lang="ts">
    import TableRow from './TableRow.svelte';
    import Clickable from '$lib/components/Clickable.svelte';
    import RowIcon from '$lib/components/RowIcon.svelte';

    import type { PageData } from './$types';
    export let data: PageData;

</script>

<ul aria-label="Playlists">
{#each data.playlists as playlist}

<li>
<Clickable href={`/playlist/${playlist.id}`}>
<TableRow --col-count="1">
    <div class="title">
    <RowIcon src={playlist.images[0].url}/>
    <div class="playlist-name">
        <section>{playlist.name}</section>
    </div>
    </div>
</TableRow>
</Clickable>
</li>

{/each}
</ul>

<style>
    ul {
        padding: 0;
        list-style: none;
    }
    .title {
        display: flex;
        gap: 10px;
    }
    .playlist-name {
        display: flex;
        align-items: center;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
</style>
