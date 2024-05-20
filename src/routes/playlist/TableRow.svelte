<script lang="ts">
</script>


<div class="root">
<div class="layout">
    <slot />
</div>
</div>

<style>
    .root {
        border-bottom: 1px solid grey;
        padding: 0.2em 0;
    }
    .layout {
        display: grid;
        grid-template-columns: repeat(var(--col-count), minmax(0, 1fr));
        gap: 10px;
        height: 2em;
        max-height: 2em;
    }
</style>
