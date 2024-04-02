<script lang="ts">
    import type { PageData } from "./$types";
    export let data: PageData;
</script>

{#if data.error}
<h1>An error occurred {data.error}</h1>
{:else}
<h1>Authenticated with code {data.code}</h1>
{/if}
