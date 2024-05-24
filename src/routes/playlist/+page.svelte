<script lang="ts">
    import TableRow from './TableRow.svelte';
    import Icon from '$lib/components/Icon.svelte';

    import type { PageData } from './$types';
    export let data: PageData;

</script>

<ul aria-label="Playlists">
{#each data.playlists as playlist}
<li>
    <a href={`/playlist/${playlist.id}`}>
        <TableRow --col-count="1">
            <div class="title">
                <Icon size="medium" src={playlist.images[0].url}/>
                <div class="playlist-name">
                    <section>{playlist.name}</section>
                </div>
            </div>
        </TableRow>
    </a>
</li>
{/each}
</ul>


<style>
    ul {
        padding: 0;
        list-style: none;
    }
    a {
        text-decoration: none;
        color: var(--main-text-color)
    }
    li:hover {
        background-color: var(--hover-bg-color);
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
