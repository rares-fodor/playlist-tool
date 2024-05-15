<script lang="ts">
    import { page } from "$app/stores"
</script>


<div class="container">
<p>{$page.status} | {$page.error?.message}</p>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 100vh;
    }
    p {
        text-align: center;
        font: 30px Arial, sans-serif;
    }
</style>
