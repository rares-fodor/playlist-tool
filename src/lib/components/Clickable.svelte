<script lang="ts">
    export let href: string;

    let onClickHanlder = (() => location.href=`${href}`)
    let keyboardEventHandler = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
            onClickHanlder()
        }
    }
</script>

<div on:click={onClickHanlder} on:keydown={keyboardEventHandler} role="button" tabindex="0">
    <slot />
</div>

<style>
    div:hover {
        background-color: #c4c4c4;
        cursor: pointer;
    }
</style>
