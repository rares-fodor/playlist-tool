<script lang="ts">
  import Track from "./Track.svelte";
  import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
  import type { PlaylistedTrack } from "$lib/api_types";

  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";

  import MaterialSymbolsMoreHoriz from "~icons/material-symbols/more-horiz";

  import { createEventDispatcher, onMount, tick } from "svelte";
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

  // Fired after every manual move (drag, row menu), with the moved track's new index
  const dispatch = createEventDispatcher<{ move: { track: PlaylistedTrack; index: number } }>();

  let virtualItemElems: HTMLDivElement[] = [];
  let listElem: HTMLDivElement;
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

          const closestEdge =
            sourceIndex > targetIndex ? ("top" as Edge) : ("bottom" as Edge);

          const moved = tracks[sourceIndex];
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

          // Notification only, the reorder above is unchanged
          notifyMove(moved, tracks.indexOf(moved));
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
      tracks = tracks;
      notifyMove(elem, targetIndex);

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

  // Returns the track's index after the move
  function handleMove(sourceIndex: number, targetIndex: number): number {
    // Moving the first track up or the last track down is a no-op
    targetIndex = Math.min(Math.max(targetIndex, 0), tracks.length - 1);
    if (targetIndex === sourceIndex) {
      return sourceIndex;
    }

    const elem = tracks[sourceIndex];
    tracks.splice(sourceIndex, 1);
    tracks.splice(targetIndex, 0, elem);
    tracks = tracks;
    notifyMove(elem, targetIndex);

    setTimeout(() => {
      const element = document.querySelector(
        `[data-track-index="${targetIndex}"]`,
      );
      if (element instanceof HTMLElement) {
        triggerPostMoveFlash(element);
      }
    }, 150);

    trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
    return targetIndex;
  }

  // Every move (drag, row menu, keyboard) goes through here: focus follows the moved track
  let announcement = "";
  async function notifyMove(track: PlaylistedTrack, index: number) {
    focusedIndex = index;
    dispatch("move", { track, index });

    // Clear first so moving to the same position twice is announced again
    announcement = "";
    await tick();
    announcement = `Moved "${track.track.name}" to position ${index + 1} of ${tracks.length}`;
  }

  /* Multi-select, by synthetic track id. Any reorder (here or in the page toolbar) clears it,
   * which is detected by comparing the id order rather than hooking every reorder path. */
  let selected = new Set<string>();
  // Id of the track Shift-click ranges start from
  let selectionAnchor: string | null = null;

  const orderKey = (list: PlaylistedTrack[]) => list.map((t) => t.id).join("\n");
  let selectionOrderKey = orderKey(tracks);
  $: onTracksChanged(tracks);
  function onTracksChanged(list: PlaylistedTrack[]) {
    const key = orderKey(list);
    if (key !== selectionOrderKey) {
      selectionOrderKey = key;
      clearSelection();
    }
  }

  function clearSelection() {
    selected = new Set();
    selectionAnchor = null;
  }

  function toggleSelected(index: number) {
    const id = tracks[index].id;
    if (!selected.delete(id)) {
      selected.add(id);
    }
    selected = selected;
    selectionAnchor = id;
  }

  // Adds every track between the two indices (inclusive) to the selection
  function selectRange(from: number, to: number) {
    const [start, end] = from < to ? [from, to] : [to, from];
    for (let i = start; i <= end; i++) {
      selected.add(tracks[i].id);
    }
    selected = selected;
  }

  function onRowClick(event: MouseEvent, index: number) {
    const target = event.target as HTMLElement;
    // The ⋯ button handles its own clicks
    if (target.closest("button")) {
      return;
    }
    if (event.shiftKey) {
      const anchorIndex = tracks.findIndex((t) => t.id === selectionAnchor);
      selectRange(anchorIndex === -1 ? index : anchorIndex, index);
      if (anchorIndex === -1) {
        selectionAnchor = tracks[index].id;
      }
    } else if (event.ctrlKey || event.metaKey || target.closest("[data-select-box]")) {
      toggleSelected(index);
    }
    // A plain click only focuses the row, which the browser already does
  }

  function keyboardExtendSelection(targetIndex: number) {
    targetIndex = Math.min(Math.max(targetIndex, 0), tracks.length - 1);
    selectRange(focusedIndex, targetIndex);
    selectionAnchor ??= tracks[focusedIndex].id;
    focusRow(targetIndex);
  }

  /* Roving focus: the list is a single Tab stop, only the focused row has tabindex=0.
   * focusedIndex lives here rather than in the DOM because rows outside the virtual
   * window aren't rendered. */
  let focusedIndex = 0;

  // Id (not index) of the track whose row menu is open, so the menu stays with the track if it moves
  let menuOpenId: string | null = null;

  $: focusedRowRendered = trackListVirtualItems.some((item) => item.index === focusedIndex);

  const rowElem = (index: number) =>
    listElem?.querySelector<HTMLElement>(`[data-track-index="${index}"]`) ?? null;

  async function focusRow(index: number) {
    if (tracks.length === 0) {
      return;
    }
    focusedIndex = Math.min(Math.max(index, 0), tracks.length - 1);
    $trackListVirtualizer.scrollToIndex(focusedIndex, { align: "auto" });

    // The row only exists once the virtualizer has reacted to the scroll
    for (let attempt = 0; attempt < 10; attempt++) {
      await tick();
      const elem = rowElem(focusedIndex);
      if (elem) {
        elem.focus();
        return;
      }
      await new Promise(requestAnimationFrame);
    }
  }

  // Back to the focused row after a row menu or dialog closes, unless the user has moved on
  function restoreRowFocus() {
    if (trackSelectDialogOpen || moveToIndexDialogOpen) {
      return null;
    }
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      listElem?.contains(active) ||
      active.closest('[role="menu"], [role="dialog"]')
    ) {
      focusRow(focusedIndex);
    }
    // Tells bits-ui not to focus anything itself
    return null;
  }

  let dialogWasOpen = false;
  $: {
    const dialogOpen = trackSelectDialogOpen || moveToIndexDialogOpen;
    if (dialogWasOpen && !dialogOpen) {
      setTimeout(restoreRowFocus);
    }
    dialogWasOpen = dialogOpen;
  }

  function onMenuOpenChange(id: string, open: boolean) {
    if (open) {
      menuOpenId = id;
      focusedIndex = tracks.findIndex((t) => t.id === id);
    } else if (menuOpenId === id) {
      menuOpenId = null;
      // Menus opened from the keyboard have no active trigger, so bits-ui won't call closeFocus
      setTimeout(restoreRowFocus);
    }
  }

  function pageSize() {
    const viewport = osRef?.osInstance()?.elements().viewport;
    const rowHeight = rowElem(focusedIndex)?.offsetHeight || 52;
    return Math.max(1, Math.floor((viewport?.clientHeight ?? 0) / rowHeight) - 1);
  }

  function keyboardMove(targetIndex: number) {
    focusRow(handleMove(focusedIndex, targetIndex));
  }

  const isRow = (target: EventTarget | null): target is HTMLElement =>
    target instanceof HTMLElement && target.getAttribute("role") === "option";

  /* Key that opened the row menu. Its auto-repeats would otherwise reach whatever took focus
   * (the first menu item, then the dialog it opens), so they're swallowed until it's released. */
  let menuOpenKey: string | null = null;

  function onWindowKeydown(event: KeyboardEvent) {
    if (menuOpenKey !== null && event.repeat && event.key === menuOpenKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function onWindowKeyup(event: KeyboardEvent) {
    if (event.key === menuOpenKey) {
      menuOpenKey = null;
    }
  }

  function openRowMenu(index: number, key: string) {
    menuOpenId = tracks[index].id;
    menuOpenKey = key;
  }

  function onListKeydown(event: KeyboardEvent) {
    // Keys on the row's own ⋯ button keep their native behaviour
    if (!isRow(event.target) || event.ctrlKey || event.metaKey) {
      return;
    }
    const index = focusedIndex;
    const key = event.key;

    if (key === "ContextMenu" || (key === "F10" && event.shiftKey)) {
      openRowMenu(index, key);
    } else if (event.shiftKey) {
      if (key === "ArrowUp") keyboardExtendSelection(index - 1);
      else if (key === "ArrowDown") keyboardExtendSelection(index + 1);
      else return;
    } else if (event.altKey) {
      if (key === "ArrowUp") keyboardMove(index - 1);
      else if (key === "ArrowDown") keyboardMove(index + 1);
      else if (key === "Home") keyboardMove(0);
      else if (key === "End") keyboardMove(tracks.length - 1);
      else return;
    } else {
      if (key === "ArrowUp") focusRow(index - 1);
      else if (key === "ArrowDown") focusRow(index + 1);
      else if (key === "Home") focusRow(0);
      else if (key === "End") focusRow(tracks.length - 1);
      else if (key === "PageUp") focusRow(index - pageSize());
      else if (key === "PageDown") focusRow(index + pageSize());
      else if (key === " ") toggleSelected(index);
      else if (key === "Enter") openRowMenu(index, key);
      // Esc with nothing selected is left alone
      else if (key === "Escape" && selected.size > 0) clearSelection();
      else return;
    }
    event.preventDefault();
  }

  // Shift+F10 / the ContextMenu key also fire a native contextmenu on the row; the row menu replaces it
  function onListContextMenu(event: MouseEvent) {
    if (isRow(event.target)) {
      event.preventDefault();
      menuOpenId = tracks[focusedIndex].id;
    }
  }

  function onListFocusin(event: FocusEvent) {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-track-index]");
    if (row) {
      focusedIndex = Number(row.dataset.trackIndex);
    } else if (event.target === listElem) {
      // Tabbed back in while the focused row is scrolled out of the virtual window
      focusRow(focusedIndex);
    }
  }
</script>

<!-- Capture phase, so held-key repeats are dropped before the menu or dialog sees them -->
<svelte:window on:keydown|capture={onWindowKeydown} on:keyup|capture={onWindowKeyup} />

<OverlayScrollbarsComponent
  bind:this={osRef}
  options={{
    scrollbars: {
      theme: "os-theme-dark",
      autoHide: "scroll",
    },
  }}
  class="h-full"
>
  <!-- --ds-background-selected is the post-move flash colour (triggerPostMoveFlash's only knob) -->
  <!-- Rows hold the ⋯ button, but it's out of the Tab order and its menu is reachable from the row -->
  <div
    bind:this={listElem}
    role="listbox"
    aria-label="Tracks"
    aria-multiselectable="true"
    aria-describedby="track-list-help"
    tabindex={tracks.length > 0 && !focusedRowRendered ? 0 : -1}
    on:keydown={onListKeydown}
    on:contextmenu={onListContextMenu}
    on:focusin={onListFocusin}
    class="focus-visible:outline-none [--ds-background-selected:hsl(var(--primary)/0.15)]"
    style="position: relative; width: 100%; height: {$trackListVirtualizer.getTotalSize()}px;"
  >
    <div
      style="position: abosolute; top: 0; left: 0; width: 100%; transform: translateY({trackListVirtualItems[0]
        ? trackListVirtualItems[0].start
        : 0}px);"
    >
      {#each trackListVirtualItems as virtItem (tracks[virtItem.index])}
        {@const item = tracks[virtItem.index]}
        {@const isSelected = selected.has(item.id)}
        <!-- Keyboard selection is handled by the listbox's keydown -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          data-track-index={virtItem.index}
          role="option"
          aria-selected={isSelected}
          aria-posinset={virtItem.index + 1}
          aria-setsize={tracks.length}
          aria-label={`${item.track.name} by ${item.track.artists[0].name}`}
          tabindex={virtItem.index === focusedIndex ? 0 : -1}
          on:click={(event) => onRowClick(event, virtItem.index)}
          class="relative grid select-none grid-cols-[1fr_2.2rem_15px] gap-3 border-b transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring {isSelected
            ? 'bg-primary/10 hover:bg-primary/15'
            : 'hover:bg-accent/60'}"
        >
          <Track index={virtItem.index} track={tracks[virtItem.index].track} selected={isSelected} />
          <!-- DropdownTrigger adds a button in this div, use flex to fix it to the correct position -->
          <DropdownMenu.Root
            open={menuOpenId === item.id}
            onOpenChange={(open) => onMenuOpenChange(item.id, open)}
            closeFocus={restoreRowFocus}
          >
            <DropdownMenu.Trigger asChild let:builder>
              <div class="flex items-center relative">
                <Button
                  size="icon"
                  variant="ghost"
                  class="h-8 w-8 text-muted-foreground hover:text-foreground"
                  tabindex={-1}
                  aria-label={`Options for ${item.track.name}`}
                  builders={[builder]}
                >
                  <MaterialSymbolsMoreHoriz class="h-5 w-5" aria-hidden="true" />
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

<p id="track-list-help" class="sr-only">
  Use arrow keys to browse. Alt plus arrow keys moves the track. Space selects the track, Shift
  plus arrow keys extends the selection, Escape clears it. Enter opens track options.
  Press question mark for all keyboard shortcuts.
</p>
<div class="sr-only" role="status" aria-live="polite">{announcement}</div>

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
        <p class={`${moveToIndexWarning ? "text-destructive" : ""} h-4`}>
          {moveToIndexWarning ?? ""}
        </p>
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="flex gap-2"
      on:submit|preventDefault={() => {
        handleMoveToIndex();
        moveToIndexDialogOpen = false;
      }}
    >
      <Input
        placeholder="Index"
        id="indexSelect"
        type="number"
        min="0"
        max={tracks.length}
        bind:value={moveToIndexValue}
      />
      <Button type="submit" disabled={moveToIndexButtonDisabled}>Confirm</Button>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.os-theme-dark) {
    --os-size: 15px;
    --os-handle-border-radius: 0px;
  }
</style>
