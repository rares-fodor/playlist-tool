<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
  import { createVirtualizer } from "@tanstack/svelte-virtual";
  import type { PlaylistedTrack } from "$lib/api_types";

  export let tracks: PlaylistedTrack[];
  export let open: boolean = false;
  export let description: string = "";

  let trackSelectSearchValue: string = "";
  let trackSelectTracks: PlaylistedTrack[] = tracks;

  let trackSelectScrollRef: OverlayScrollbarsComponent | undefined;
  $: trackSelectVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>(
    {
      count: trackSelectTracks.length,
      getScrollElement: () =>
        // @ts-ignore: Assign HTMLElement | undefined to HTMLDivElement | null
        trackSelectScrollRef?.osInstance()?.elements().viewport,
      estimateSize: () => 45,
      overscan: 5,
    },
  );
  $: trackSelectVirtualItems = $trackSelectVirtualizer.getVirtualItems();
  $: {
    if (trackSelectSearchValue === "") {
      trackSelectTracks = tracks;
    } else {
      const searchValueNormalized = trackSelectSearchValue
        .toLocaleLowerCase()
        .replace("/s+g", "");
      trackSelectTracks = tracks.filter((track) => {
        const trackNameNormalized = track.track.name
          .toLowerCase()
          .replace("/s+g", "");
        return trackNameNormalized.includes(searchValueNormalized, 0);
      });
    }
  }

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  function handleSelect(id: string) {
    dispatch("select", { id });
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Select a track</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
      <Input
        bind:value={trackSelectSearchValue}
        type="search"
        placeholder="Search track"
      />
    </Dialog.Header>
    <OverlayScrollbarsComponent
      bind:this={trackSelectScrollRef}
      options={{
        scrollbars: {
          theme: "os-theme-dark",
        },
      }}
      class="h-[350px]"
    >
      <div class="flex flex-col gap-1">
        <div
          style="position: relative; height: {$trackSelectVirtualizer.getTotalSize()}px; width: 100%"
        >
          {#each trackSelectVirtualItems as virtItem}
            <button
              style="position: absolute; top: 0; left: 0; width: 100%; height: {virtItem.size}px; transform: translateY({virtItem.start}px;"
              on:click={() =>
                handleSelect(trackSelectTracks[virtItem.index].id)}
            >
              <div class="flex items-center gap-2 p-1">
                <Icon
                  size="medium"
                  src={trackSelectTracks[virtItem.index].track.album.images[0]
                    .url}
                />
                <span>{trackSelectTracks[virtItem.index].track.name}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </OverlayScrollbarsComponent>
  </Dialog.Content>
</Dialog.Root>
