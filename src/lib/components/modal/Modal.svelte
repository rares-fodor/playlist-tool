<!-- source: https://svelte.dev/examples/modal -->

<script lang="ts">
    export let showModal: boolean;

    let dialog: HTMLDialogElement;

    $: if (dialog) {
        if (showModal) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
    bind:this={dialog}
    on:close={() => (showModal = false)}
    on:click|self={() => dialog.close()}
    class="max-w-[32em] border-none p-0"
>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div on:click|stopPropagation class="p-4 flex flex-col gap-3">
        <slot name="header" />
        <slot name="body"/>
        <div class="flex justify-between items-center">
            <slot name="footer"/>
            <button class="p-1 bg-gray-200 hover:bg-gray-300" on:click={() => dialog.close()}>Close</button>
        </div>
    </div>
</dialog>

