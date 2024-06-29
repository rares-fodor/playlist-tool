<script lang="ts">
  import Modal from "./Modal.svelte";

  import { createEventDispatcher } from "svelte";

  export let showModal: boolean;
  export let question: string | undefined;
  export let confirmMessage: string | undefined = undefined;

  let confirmed: boolean;

  const dispatch = createEventDispatcher();
  function handleConfirm() {
    dispatch("confirm");
    if (confirmMessage === undefined) {
      showModal = false;
    }
    confirmed = true;
  }

  $: {
    if (!showModal) {
      confirmed = false;
    }
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
      <button class="p-1 bg-gray-200 hover:bg-gray-300" on:click={handleConfirm}
        >OK</button
      >
    {/if}
  </svelte:fragment>
</Modal>
