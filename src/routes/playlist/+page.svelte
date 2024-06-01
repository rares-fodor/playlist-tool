<script lang="ts">
    import Icon from '$lib/components/Icon.svelte';

    import type { PageData } from './$types';
    export let data: PageData;

</script>

<ul aria-label="Playlists" class="p-0 list-none">
{#each data.playlists as playlist}
<li class="hover:bg-gray-300">
    <a href={`/playlist/${playlist.id}`}>
        <div class="flex align-middle gap-3 py-1 border-b border-b-gray-400">
            <Icon size="medium" src={playlist.images[0].url}/>
            <div class="flex items-center"><span>{playlist.name}</span></div>
        </div>
    </a>
</li>
{/each}
</ul>

