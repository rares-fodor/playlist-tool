<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    export let data: PageData;
</script>


<h1>Logged in as {data.user.username}</h1>
<form method="POST" use:enhance>
    <button>Log out</button>
</form>
<h1>User has {data.playlists.total} playlists</h1>
