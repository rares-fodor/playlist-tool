<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
  import { createVirtualizer } from "@tanstack/svelte-virtual";
  import { createEventDispatcher } from "svelte";
  import type { PlaylistedTrack } from "$lib/api_types";

  export let tracks: PlaylistedTrack[];
  export let open: boolean = false;
  export let description: string = "";

  const dispatch = createEventDispatcher();
  const listboxId = "track-select-listbox";
  const optionId = (index: number) => `track-select-option-${index}`;

  let trackSelectSearchValue: string = "";
  let trackSelectTracks: PlaylistedTrack[] = tracks;
  // Highlighted result; focus stays in the search input (combobox pattern)
  let activeIndex = 0;

  let trackSelectScrollRef: OverlayScrollbarsComponent | undefined;
  $: trackSelectVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>(
    {
      count: trackSelectTracks.length,
      getScrollElement: () =>
        // @ts-ignore: Assign HTMLElement | undefined to HTMLDivElement | null
        trackSelectScrollRef?.osInstance()?.elements().viewport,
      estimateSize: () => 44,
      overscan: 5,
    },
  );
  $: trackSelectVirtualItems = $trackSelectVirtualizer.getVirtualItems();

  $: if (open) {
    trackSelectSearchValue = "";
  }

  $: {
    if (trackSelectSearchValue === "") {
      trackSelectTracks = tracks;
    } else {
      const searchValueNormalized = trackSelectSearchValue
        .toLocaleLowerCase()
        .replace(/\s+/g, "");
      trackSelectTracks = tracks.filter((track) => {
        const trackNameNormalized = track.track.name
          .toLocaleLowerCase()
          .replace(/\s+/g, "");
        return trackNameNormalized.includes(searchValueNormalized);
      });
    }
    activeIndex = 0;
  }

  function setActive(index: number) {
    if (trackSelectTracks.length === 0) {
      return;
    }
    activeIndex = Math.min(Math.max(index, 0), trackSelectTracks.length - 1);
    $trackSelectVirtualizer.scrollToIndex(activeIndex, { align: "auto" });
  }

  // Rows that fit in the viewport, for PageUp/PageDown
  const pageSize = 7;

  function onSearchKeydown(event: KeyboardEvent) {
    const last = trackSelectTracks.length - 1;
    switch (event.key) {
      case "ArrowDown":
        setActive(activeIndex >= last ? 0 : activeIndex + 1);
        break;
      case "ArrowUp":
        setActive(activeIndex <= 0 ? last : activeIndex - 1);
        break;
      case "PageDown":
        setActive(activeIndex + pageSize);
        break;
      case "PageUp":
        setActive(activeIndex - pageSize);
        break;
      case "Home":
        if (!event.ctrlKey) return;
        setActive(0);
        break;
      case "End":
        if (!event.ctrlKey) return;
        setActive(last);
        break;
      case "Enter":
        if (trackSelectTracks[activeIndex]) {
          handleSelect(trackSelectTracks[activeIndex].id);
        }
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function handleSelect(id: string) {
    dispatch("select", { id });
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="flex max-h-[85dvh] flex-col">
    <Dialog.Header>
      <Dialog.Title>Select a track</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
    </Dialog.Header>
    <Input
      bind:value={trackSelectSearchValue}
      on:keydown={onSearchKeydown}
      type="search"
      placeholder="Search track"
      role="combobox"
      aria-label="Search track"
      aria-expanded="true"
      aria-autocomplete="list"
      aria-controls={listboxId}
      aria-activedescendant={trackSelectTracks.length > 0 ? optionId(activeIndex) : undefined}
    />
    <OverlayScrollbarsComponent
      bind:this={trackSelectScrollRef}
      options={{
        scrollbars: {
          theme: "os-theme-dark",
        },
      }}
      class="-mx-2 h-[350px] min-h-0"
    >
      {#if trackSelectTracks.length === 0}
        <p class="py-6 text-center text-sm text-muted-foreground">No tracks match your search.</p>
      {/if}
      <div
        id={listboxId}
        role="listbox"
        aria-label="Tracks"
        class="mx-2"
        style="position: relative; height: {$trackSelectVirtualizer.getTotalSize()}px;"
      >
        {#each trackSelectVirtualItems as virtItem (virtItem.key)}
          {@const item = trackSelectTracks[virtItem.index]}
          {@const active = virtItem.index === activeIndex}
          <!-- Options aren't focusable; the input handles the keyboard via aria-activedescendant -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            id={optionId(virtItem.index)}
            role="option"
            aria-selected={active}
            tabindex="-1"
            class="flex cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm transition-colors {active
              ? 'bg-accent'
              : ''}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: {virtItem.size}px; transform: translateY({virtItem.start}px);"
            on:mousemove={() => (activeIndex = virtItem.index)}
            on:click={() => handleSelect(item.id)}
          >
            <Icon size="medium" src={item.track.album.images[0]?.url} />
            <span class="min-w-0 flex-1 truncate">
              {item.track.name}
              <span class="text-muted-foreground">· {item.track.artists[0].name}</span>
            </span>
          </div>
        {/each}
      </div>
    </OverlayScrollbarsComponent>
  </Dialog.Content>
</Dialog.Root>
