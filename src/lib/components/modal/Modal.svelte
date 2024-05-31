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
>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div on:click|stopPropagation>
        <slot name="header" />
        <slot name="body"/>
        <div class="footer">
            <slot name="footer"/>
            <button on:click={() => dialog.close()}>Close</button>
        </div>
    </div>
</dialog>

<style>
    dialog {
        max-width: 32em;
        border-radius: 0.2em;
        border: none;
        padding: 0;
    }
    dialog::backdrop {
        background: rgba(0, 0, 0, 0.3);
    }
    dialog > div {
        padding: 1em;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    button {
        display: block;
    }
</style>

