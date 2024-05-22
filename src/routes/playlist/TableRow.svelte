<script lang="ts">
</script>


<div class="layout">
    <slot />
</div>

<style>
    .layout {
        display: grid;
        grid-template-columns: repeat(var(--col-count), minmax(0, 1fr));
        border-bottom: 1px solid grey;
        padding: 0.2em 0;
        gap: 10px;
        min-height: 2em;
    }
</style>
