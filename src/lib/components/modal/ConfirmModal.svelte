<script lang="ts">
    import Modal from "./Modal.svelte";

    import { createEventDispatcher } from "svelte";

    export let showModal: boolean;
    export let question: string | undefined;
    export let confirmMessage: string | undefined = undefined;

    let confirmed: boolean

    const dispatch = createEventDispatcher();
    function handleConfirm() {
        dispatch('confirm');
        if (confirmMessage === undefined) {
            showModal = false;
            console.log(showModal)
        }
        confirmed = true;
    }

</script>

<Modal bind:showModal>
    <div slot="body">
        {#if confirmed && confirmMessage !== undefined}
            <p>{confirmMessage}</p>
        {:else}
            <p>{question}</p>
        {/if}
    </div>
    <svelte:fragment slot="footer">
    {#if !confirmed}
        <button on:click={handleConfirm}>OK</button>
    {/if}
    </svelte:fragment>
</Modal>


