<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { tick } from "svelte";
  import MaterialSymbolsCheck from "~icons/material-symbols/check";
  import MaterialSymbolsExpandMore from "~icons/material-symbols/expand-more";

  import type { Playlist } from "$lib/api_types";

  // Playlists that can be committed to; the current playlist, if present, is listed first
  export let targets: Playlist[];
  export let currentId: string;
  export let selected: Playlist | undefined;

  let open = false;
  // Selection inside the dialog, only applied on confirm
  let pending: Playlist | undefined;
  let focusIndex = 0;
  let options: HTMLButtonElement[] = [];

  $: orderedTargets = [
    ...targets.filter((t) => t.id === currentId),
    ...targets.filter((t) => t.id !== currentId),
  ];

  $: if (open) onOpen();

  function onOpen() {
    pending = selected;
    const index = orderedTargets.findIndex((t) => t.id === selected?.id);
    focusIndex = Math.max(index, 0);
  }

  async function choose(index: number) {
    focusIndex = index;
    pending = orderedTargets[index];
    await tick();
    options[index]?.focus();
  }

  // Radio group keyboard pattern: arrows move and select, Enter confirms
  function onKeydown(event: KeyboardEvent) {
    const last = orderedTargets.length - 1;
    let next: number | undefined;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = focusIndex >= last ? 0 : focusIndex + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = focusIndex <= 0 ? last : focusIndex - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      case "Enter":
        event.preventDefault();
        apply();
        return;
      default:
        return;
    }
    event.preventDefault();
    choose(next);
  }

  function apply() {
    if (pending === undefined) {
      return;
    }
    selected = pending;
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger asChild let:builder>
    <Button variant="outline" builders={[builder]} class="max-w-full gap-2 pl-2">
      {#if selected}
        <Icon size="small" src={selected.images[0]?.url} class="h-5 w-5" />
        <span class="truncate">
          <span class="text-muted-foreground">Target:</span>
          {selected.id === currentId ? "This playlist" : selected.name}
        </span>
      {:else}
        <span class="pl-1">Choose target playlist</span>
      {/if}
      <MaterialSymbolsExpandMore class="h-4 w-4 shrink-0" aria-hidden="true" />
    </Button>
  </Dialog.Trigger>
  <Dialog.Content class="flex max-h-[85dvh] flex-col">
    <Dialog.Header>
      <Dialog.Title>Choose a target playlist</Dialog.Title>
      <Dialog.Description>
        Committing replaces the target playlist's tracks with the current order.
      </Dialog.Description>
    </Dialog.Header>

    {#if orderedTargets.length === 0}
      <p class="py-6 text-center text-sm text-muted-foreground">
        None of your visible playlists can be committed to. You can only commit to playlists you own that
        aren't collaborative and have at most 100 tracks.
      </p>
    {:else}
      <!-- Focus is roved between the radios, the group itself isn't a tab stop -->
      <!-- svelte-ignore a11y-interactive-supports-focus -->
      <div
        role="radiogroup"
        aria-label="Target playlist"
        class="-mx-2 flex min-h-0 flex-col gap-0.5 overflow-y-auto p-2"
        on:keydown={onKeydown}
      >
        {#each orderedTargets as target, i (target.id)}
          {@const checked = pending?.id === target.id}
          <button
            bind:this={options[i]}
            type="button"
            role="radio"
            aria-checked={checked}
            tabindex={i === focusIndex ? 0 : -1}
            on:click={() => choose(i)}
            on:dblclick={apply}
            class="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent {checked
              ? 'bg-primary/10 font-medium'
              : ''}"
          >
            <Icon size="medium" src={target.images[0]?.url} />
            <span class="min-w-0 flex-1 truncate">
              {target.name}
              {#if target.id === currentId}
                <span class="text-muted-foreground">(this playlist)</span>
              {/if}
            </span>
            <MaterialSymbolsCheck
              class="h-5 w-5 shrink-0 text-primary {checked ? '' : 'invisible'}"
              aria-hidden="true"
            />
          </button>
        {/each}
      </div>
    {/if}

    <Dialog.Footer class="gap-2">
      <Button variant="outline" on:click={() => (open = false)}>Cancel</Button>
      <Button disabled={pending === undefined} on:click={apply}>Use as target</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
