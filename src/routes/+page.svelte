<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    export let data: PageData;
</script>


<h1>Logged in as {data.user?.username}</h1>
<form method="POST" use:enhance>
    <button class="bg-gray-200 p-1 hover:bg-gray-300">Log out</button>
</form>

<br>
<a href="/playlist" class="bg-gray-200 p-1 hover:bg-gray-300">Playlist tool</a>
<br>
<a href="/discover" class="bg-gray-200 p-1 hover:bg-gray-300">Discover</a>
