<script lang="ts">
  import Track from "./Track.svelte";
  import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
  import type { PlaylistedTrack } from "$lib/api_types";

  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";

  import MaterialSymbolsMoreHoriz from "~icons/material-symbols/more-horiz";

  import { onMount } from "svelte";
  import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
  import { createVirtualizer } from "@tanstack/svelte-virtual";
  import { isTrackData } from "./track-data";
  import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
  import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
  import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
  import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
  import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types/";
  import TrackSelectDialog from "./TrackSelectDialog.svelte";

  export let tracks: PlaylistedTrack[];

  let virtualItemElems: HTMLDivElement[] = [];
  let osRef: OverlayScrollbarsComponent | undefined;

  // Prevents reinitialization of virtualizer when tracks changes
  let count: number = tracks.length;

  $: trackListVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count,
    // @ts-ignore: Assign HTMLElement | undefined to HTMLDivElement | null
    getScrollElement: () => osRef?.osInstance()?.elements().viewport,
    estimateSize: () => 44,
    overscan: 5,
  });

  $: trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
  $: {
    if (tracks) {
      trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
    }
  }
  $: {
    if (virtualItemElems.length) {
      virtualItemElems.forEach((elem) =>
        $trackListVirtualizer.measureElement(elem),
      );
    }
  }

  onMount(() => {
    return combine(
      monitorForElements({
        canMonitor({ source }) {
          console.log(isTrackData);
          return isTrackData(source.data);
        },
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0];
          if (!target) {
            return;
          }
          const sourceData = source.data;
          const targetData = target.data;

          if (!isTrackData(sourceData) || !isTrackData(targetData)) {
            return;
          }

          const sourceIndex = sourceData.trackIndex;
          const targetIndex = targetData.trackIndex;
          console.log(sourceIndex, targetIndex);

          const closestEdge =
            sourceIndex > targetIndex ? ("top" as Edge) : ("bottom" as Edge);

          tracks = reorderWithEdge({
            list: tracks,
            startIndex: sourceIndex,
            indexOfTarget: targetIndex,
            closestEdgeOfTarget: closestEdge,
            axis: "vertical",
          });

          trackListVirtualItems = $trackListVirtualizer.getVirtualItems();

          setTimeout(() => {
            const element = document.querySelector(
              `[data-track-index="${targetData.trackIndex}"]`,
            );
            if (element instanceof HTMLElement) {
              triggerPostMoveFlash(element);
            }
          }, 50);
        },
      }),
      autoScrollForElements({
        element: osRef?.osInstance()?.elements().viewport!,
      }),
    );
  });

  let trackSelectDialogOpen = false;
  let trackSelectDescription: string = "";
  let handleTrackSelect: (id: string) => void;
  function handleInsert(sourceIndex: number, side: "above" | "below") {
    // Naming is confusing here
    // sourceIndex is index at which command was requested
    // originIndex is index from which to move
    // targetIndex is index of selected track after move

    handleTrackSelect = (id: string) => {
      let targetIndex = sourceIndex;
      let originIndex = tracks.findIndex((track) => track.id === id);

      if (side === "above" && originIndex < targetIndex) {
        targetIndex--;
      } else if (side === "below" && originIndex > targetIndex) {
        targetIndex++;
      }

      const elem = tracks[originIndex];
      tracks.splice(originIndex, 1);
      tracks.splice(targetIndex, 0, elem);

      setTimeout(() => {
        const element = document.querySelector(
          `[data-track-index="${targetIndex}"]`,
        );
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element);
        }
      }, 150);

      trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
    };

    const track = tracks[sourceIndex].track;
    trackSelectDescription = `Selected track will be moved ${side} "${track.artists[0].name} - ${track.name}"`;

    trackSelectDialogOpen = true;
  }

  let moveToIndexValue: string;
  let moveToIndexWarning: string | undefined = undefined;
  let moveToIndexDialogOpen: boolean = false;
  $: moveToIndexButtonDisabled = Number.isNaN(parseInt(moveToIndexValue));
  $: {
    let moveToIndexValueInt = parseInt(moveToIndexValue);
    if (Number.isNaN(moveToIndexValueInt)) {
      moveToIndexWarning = "Please input a number";
    } else if (moveToIndexValueInt > tracks.length) {
      moveToIndexWarning = "Limit exceeded, will move to bottom instead";
    } else if (moveToIndexValueInt < 0) {
      moveToIndexWarning = "Index negative, will move to top instead";
    } else {
      moveToIndexWarning = undefined;
    }
  }
  let moveToIndexSource: number;
  function handleMoveToIndex() {
    let moveToIndexValueInt = parseInt(moveToIndexValue);
    if (Number.isNaN(moveToIndexValueInt)) {
      return;
    }
    if (moveToIndexValueInt > tracks.length) {
      moveToIndexValueInt = tracks.length;
    } else if (moveToIndexValueInt < 0) {
      moveToIndexValueInt = 0;
    }

    handleMove(moveToIndexSource, moveToIndexValueInt);
  }

  function handleMove(sourceIndex: number, targetIndex: number) {
    // Function won't be called unless dropdown is active and if dropdown is active we know index is set

    const elem = tracks[sourceIndex];
    tracks.splice(sourceIndex, 1);
    tracks.splice(targetIndex, 0, elem);

    setTimeout(() => {
      const element = document.querySelector(
        `[data-track-index="${targetIndex}"]`,
      );
      if (element instanceof HTMLElement) {
        triggerPostMoveFlash(element);
      }
    }, 150);

    trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
  }
</script>

<OverlayScrollbarsComponent
  bind:this={osRef}
  options={{
    scrollbars: {
      theme: "os-theme-dark",
      autoHide: "scroll",
    },
  }}
  class="h-[650px]"
>
  <div
    style="position: relative; width: 100%; height: {$trackListVirtualizer.getTotalSize()}px;"
  >
    <div
      style="position: abosolute; top: 0; left: 0; width: 100%; transform: translateY({trackListVirtualItems[0]
        ? trackListVirtualItems[0].start
        : 0}px);"
    >
      {#each trackListVirtualItems as virtItem (tracks[virtItem.index])}
        <div
          data-track-index={virtItem.index}
          class="grid grid-cols-[1fr_2.2rem_15px] gap-3 hover:bg-gray-200 border-b border-b-gray-300"
        >
          <Track index={virtItem.index} track={tracks[virtItem.index].track} />
          <!-- DropdownTrigger adds a button in this div, use flex to fix it to the correct position -->
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <div class="flex items-center relative">
                <Button
                  size="icon"
                  variant="outline"
                  class="h-8 w-8"
                  builders={[builder]}
                >
                  <MaterialSymbolsMoreHoriz
                    style="width: 2em; height: 2em;"
                    class={`text-gray-700 hover:text-black`}
                  />
                </Button>
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="left" align="start" alignOffset={-5}>
              <DropdownMenu.Group>
                <DropdownMenu.Label>Options</DropdownMenu.Label>
                <DropdownMenu.Item
                  on:click={() => {
                    handleInsert(virtItem.index, "above");
                  }}
                >
                  Insert above
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  on:click={() => {
                    handleInsert(virtItem.index, "below");
                  }}
                >
                  Insert below
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  on:click={() => {
                    handleMove(virtItem.index, virtItem.index - 1);
                  }}
                >
                  Move up
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  on:click={() => {
                    handleMove(virtItem.index, virtItem.index + 1);
                  }}
                >
                  Move down
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  on:click={() => {
                    handleMove(virtItem.index, 0);
                  }}
                >
                  Move to top
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  on:click={() => {
                    handleMove(virtItem.index, tracks.length);
                  }}
                >
                  Move to bottom
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  on:click={() => {
                    moveToIndexDialogOpen = true;
                    moveToIndexSource = virtItem.index;
                  }}
                >
                  Move to index
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/each}
    </div>
  </div>
</OverlayScrollbarsComponent>

<TrackSelectDialog
  {tracks}
  description={trackSelectDescription}
  bind:open={trackSelectDialogOpen}
  on:select={(event) => handleTrackSelect(event.detail.id)}
/>

<Dialog.Root bind:open={moveToIndexDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Move to index (0 - {tracks.length})</Dialog.Title>
      <Dialog.Description>
        <p class={`${moveToIndexWarning ? "text-red-600" : ""} h-4`}>
          {moveToIndexWarning ?? ""}
        </p>
      </Dialog.Description>
    </Dialog.Header>
    <div class="flex gap-2">
      <Input
        placeholder="Index"
        id="indexSelect"
        type="number"
        min="0"
        max={tracks.length}
        bind:value={moveToIndexValue}
      />
      <Button
        on:click={() => {
          handleMoveToIndex();
          if (!moveToIndexButtonDisabled) {
            moveToIndexDialogOpen = false;
          }
        }}
        class={`${moveToIndexButtonDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        Confirm
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.os-theme-dark) {
    --os-size: 15px;
    --os-handle-border-radius: 0px;
  }
</style>
