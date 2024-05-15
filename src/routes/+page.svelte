<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    export let data: PageData;
</script>


<h1>Logged in as {data.user.username}</h1>
<form method="POST" use:enhance>
    <button>Log out</button>
</form>

<br>
<a href="/playlist">Playlist tool</a>
<br>
<a href="/discover">Discover</a>
