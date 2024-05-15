<script lang="ts">
    import type { PageData } from './$types';

    export let data: PageData;
</script>

{#each data.playlists as { name, id }, i}
<a href={`/playlist/${id}`}>{i} - {name}</a>
<br>
{/each}
