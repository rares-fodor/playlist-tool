<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
</script>

<svelte:head>
  <title>Log in · Playlist Tool</title>
</svelte:head>

<div class="flex flex-1 items-center justify-center py-12">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title tag="h1" class="text-2xl">Welcome</Card.Title>
      <Card.Description>
        Log in with your Spotify account to reorder, shuffle and copy your playlists.
      </Card.Description>
    </Card.Header>
    <Card.Footer>
      <Button href="/api/auth/login" class="w-full">Log in with Spotify</Button>
    </Card.Footer>
  </Card.Root>
</div>
