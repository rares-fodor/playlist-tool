<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
</script>

<svelte:head>
  <title>{$page.status} · Playlist Tool</title>
</svelte:head>

<div class="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
  <p class="text-6xl font-bold text-primary">{$page.status}</p>
  <h1 class="text-xl font-semibold">{$page.error?.message ?? "Something went wrong"}</h1>
  <Button href="/playlist" variant="outline">Back to playlists</Button>
</div>
