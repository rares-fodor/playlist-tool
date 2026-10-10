<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { tick } from "svelte";
  import MaterialSymbolsAdd from "~icons/material-symbols/add";
  import MaterialSymbolsCheck from "~icons/material-symbols/check";
  import MaterialSymbolsExpandMore from "~icons/material-symbols/expand-more";

  import type { Playlist } from "$lib/api_types";

  // Playlists that can be committed to; the current playlist, if present, is listed first
  export let targets: Playlist[];
  export let currentId: string;
  export let selected: Playlist | undefined;
  // Whether to offer creating a new target, listed after the targets
  export let canCreate = false;
  export let defaultName = "";
  // Creates the playlist; resolves to undefined if that failed
  export let create: (name: string) => Promise<Playlist | undefined> = async () => undefined;

  let open = false;
  // Selection inside the dialog, only applied on confirm
  let pending: Playlist | undefined;
  // "New playlist…" is selected instead of a target
  let newPending = false;
  let newName = "";
  let creating = false;
  let focusIndex = 0;
  let options: HTMLButtonElement[] = [];

  $: orderedTargets = [
    ...targets.filter((t) => t.id === currentId),
    ...targets.filter((t) => t.id !== currentId),
  ];

  // "New playlist…" comes first, the targets' option indices follow it
  const newIndex = 0;
  $: offset = canCreate ? 1 : 0;
  $: optionCount = orderedTargets.length + offset;

  $: if (open) onOpen();

  function onOpen() {
    pending = selected;
    newPending = false;
    newName = defaultName;
    const index = orderedTargets.findIndex((t) => t.id === selected?.id);
    focusIndex = index >= 0 ? index + offset : 0;
  }

  async function choose(index: number) {
    focusIndex = index;
    newPending = canCreate && index === newIndex;
    pending = newPending ? undefined : orderedTargets[index - offset];
    await tick();
    options[index]?.focus();
  }

  async function focusNameField() {
    await tick();
    document.getElementById("new-target-name")?.focus();
  }

  async function chooseNew() {
    await choose(newIndex);
    focusNameField();
  }

  async function submitNew() {
    const name = newName.trim();
    if (creating || name === "") {
      return;
    }
    creating = true;
    const created = await create(name);
    creating = false;
    if (created) {
      selected = created;
      open = false;
    }
  }

  // Radio group keyboard pattern: arrows move and select, Enter confirms
  function onKeydown(event: KeyboardEvent) {
    // Keys typed in the name field are the field's own
    if (event.target instanceof HTMLElement && event.target.closest("form")) {
      return;
    }
    const last = optionCount - 1;
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
        if (newPending) {
          focusNameField();
        } else {
          apply();
        }
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

    {#if optionCount === 0}
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
        {#if canCreate}
          <button
            bind:this={options[newIndex]}
            type="button"
            role="radio"
            aria-checked={newPending}
            tabindex={newIndex === focusIndex ? 0 : -1}
            on:click={chooseNew}
            class="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent {newPending
              ? 'bg-primary/10 font-medium'
              : ''}"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-dashed">
              <MaterialSymbolsAdd class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1 truncate">New playlist…</span>
            <MaterialSymbolsCheck
              class="h-5 w-5 shrink-0 text-primary {newPending ? '' : 'invisible'}"
              aria-hidden="true"
            />
          </button>
          {#if newPending}
            <!-- Right under its row; the group's key handling skips it, so Enter submits it -->
            <form class="mb-2 flex flex-col gap-2 px-2 pt-1" on:submit|preventDefault={submitNew}>
              <Label for="new-target-name">Name</Label>
              <div class="flex gap-2">
                <Input id="new-target-name" bind:value={newName} readonly={creating} autocomplete="off" />
                <Button type="submit" disabled={creating || newName.trim() === ""} class="shrink-0">
                  {creating ? "Creating…" : "Create"}
                </Button>
              </div>
              <p class="text-sm text-muted-foreground">
                Creates a private playlist on Spotify and uses it as the target.
              </p>
            </form>
          {/if}
        {/if}
        {#each orderedTargets as target, i (target.id)}
          {@const checked = pending?.id === target.id}
          <button
            bind:this={options[i + offset]}
            type="button"
            role="radio"
            aria-checked={checked}
            tabindex={i + offset === focusIndex ? 0 : -1}
            on:click={() => choose(i + offset)}
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
