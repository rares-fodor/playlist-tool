<script lang="ts">
  import Track from "./Track.svelte";
  import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
  import type { PlaylistedTrack } from "$lib/api_types";

  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Tooltip from "$lib/components/ui/tooltip";
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
  import { blockRange, pruneGroups, pullTogether, toBlocks, type GroupMap } from "$lib/track-groups";

  export let tracks: PlaylistedTrack[];
  export let groups: GroupMap;

  const dispatch = createEventDispatcher<{
    // Fired after every manual move (drag, row menu), with the moved track's new index
    move: { track: PlaylistedTrack; index: number };
    // Fired after groups are made or dissolved; `reordered` if tracks moved to keep groups contiguous
    groupschange: { reordered: boolean };
  }>();

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
        onDragStart({ source }) {
          if (isTrackData(source.data)) {
            const index = source.data.trackIndex;
            const [start, end] = blockRange(tracks, groups, index);
            dragSource = start === end ? null : { start, end, index };
          }
        },
        onDropTargetChange({ location, source }) {
          groupDrop = null;
          const target = location.current.dropTargets[0];
          if (!target || !isTrackData(source.data) || !isTrackData(target.data)) {
            return;
          }
          const sourceIndex = source.data.trackIndex;
          const targetIndex = target.data.trackIndex;
          const [start, end] = blockRange(tracks, groups, targetIndex);
          if (start !== end && (sourceIndex < start || sourceIndex > end)) {
            groupDrop = { start, end, edge: sourceIndex > targetIndex ? "top" : "bottom" };
          }
        },
        onDrop({ location, source }) {
          dragSource = null;
          groupDrop = null;
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

          // Groups move as one block and nothing lands inside one: reorder the list of blocks
          // (single tracks are blocks of one, so without groups this is the plain track reorder)
          const blocks = toBlocks(tracks, groups);
          const blockOf = (index: number) => {
            let seen = 0;
            return blocks.findIndex((block) => (seen += block.length) > index);
          };
          const sourceBlock = blockOf(sourceIndex);
          const targetBlock = blockOf(targetIndex);
          if (sourceBlock === targetBlock) {
            return;
          }

          const moved = tracks[sourceIndex];
          tracks = reorderWithEdge({
            list: blocks,
            startIndex: sourceBlock,
            indexOfTarget: targetBlock,
            closestEdgeOfTarget: closestEdge,
            axis: "vertical",
          }).flat();
          const movedIndex = tracks.indexOf(moved);

          trackListVirtualItems = $trackListVirtualizer.getVirtualItems();

          setTimeout(() => {
            const element = document.querySelector(
              `[data-track-index="${movedIndex}"]`,
            );
            if (element instanceof HTMLElement) {
              triggerPostMoveFlash(element);
            }
          }, 50);

          // Notification only, the reorder above is unchanged
          notifyMove(moved, movedIndex, blocks[sourceBlock].length);
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
  function handleInsert(anchorIndex: number, side: "above" | "below") {
    // Moves the chosen track (with its group) next to the track the menu was opened on,
    // or next to that track's group if it's in one
    handleTrackSelect = (id: string) => {
      const originIndex = tracks.findIndex((track) => track.id === id);
      const [start, end] = blockRange(tracks, groups, originIndex);
      if (anchorIndex >= start && anchorIndex <= end) {
        return;
      }
      // Anchor's index once the moving block is taken out
      const restIndex = anchorIndex > end ? anchorIndex - (end - start + 1) : anchorIndex;
      if (side === "above") {
        moveBlock(originIndex, restIndex, "before");
      } else {
        moveBlock(originIndex, restIndex + 1, "after");
      }
    };

    const track = tracks[anchorIndex].track;
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

  // Moves the track (with its group) so it ends up at targetIndex, or as close as groups allow.
  // Returns the track's index after the move.
  function handleMove(sourceIndex: number, targetIndex: number): number {
    const [start] = blockRange(tracks, groups, sourceIndex);
    return moveBlock(
      sourceIndex,
      targetIndex - (sourceIndex - start),
      targetIndex < sourceIndex ? "before" : "after",
    );
  }

  const sameGroup = (a: PlaylistedTrack, b: PlaylistedTrack) =>
    groups.has(a.id) && groups.get(a.id) === groups.get(b.id);

  /* Moves the block (group or single track) containing sourceIndex to `position` among the other
   * tracks. Nothing can land inside a group, so a position inside one snaps to its start ("before")
   * or past its end ("after"). Returns the source track's index after the move. */
  function moveBlock(sourceIndex: number, position: number, snap: "before" | "after"): number {
    const [start, end] = blockRange(tracks, groups, sourceIndex);
    const block = tracks.slice(start, end + 1);
    const rest = [...tracks.slice(0, start), ...tracks.slice(end + 1)];

    position = Math.min(Math.max(position, 0), rest.length);
    while (position > 0 && position < rest.length && sameGroup(rest[position - 1], rest[position])) {
      position += snap === "before" ? -1 : 1;
    }
    // Moving the first block up or the last block down is a no-op
    if (position === start) {
      return sourceIndex;
    }

    tracks = [...rest.slice(0, position), ...block, ...rest.slice(position)];
    const targetIndex = position + (sourceIndex - start);
    notifyMove(tracks[targetIndex], targetIndex, block.length);

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
  function notifyMove(track: PlaylistedTrack, index: number, blockSize = 1) {
    focusedIndex = index;
    dispatch("move", { track, index });

    const position = `position ${index + 1} of ${tracks.length}`;
    announce(
      blockSize > 1
        ? `Moved group of ${blockSize} tracks with "${track.track.name}" to ${position}`
        : `Moved "${track.track.name}" to ${position}`,
    );
  }

  let announcement = "";
  async function announce(text: string) {
    // Clear first so the same message twice (e.g. moving to the same position) is announced again
    announcement = "";
    await tick();
    announcement = text;
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

  // Selecting or deselecting a grouped track does the same to its whole group
  function toggleSelected(index: number) {
    const id = tracks[index].id;
    const [start, end] = blockRange(tracks, groups, index);
    const ids = tracks.slice(start, end + 1).map((t) => t.id);
    if (selected.has(id)) {
      ids.forEach((id) => selected.delete(id));
    } else {
      ids.forEach((id) => selected.add(id));
    }
    selected = selected;
    selectionAnchor = id;
  }

  // Adds every track between the two indices (inclusive) to the selection, plus whole groups at the ends
  function selectRange(from: number, to: number) {
    const [first, last] = from < to ? [from, to] : [to, from];
    const start = blockRange(tracks, groups, first)[0];
    const end = blockRange(tracks, groups, last)[1];
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

  /* Groups. The selection always holds whole groups, so grouping it merges any groups in it and
   * ungrouping it dissolves every group it touches. */
  $: selectionGroups = new Set([...selected].flatMap((id) => groups.get(id) ?? []));
  $: selectionHasUngrouped = [...selected].some((id) => !groups.has(id));
  // Read by the page's selection toolbar, alongside the exported group actions below
  export let selectedCount = 0;
  export let canGroup = false;
  export let canUngroup = false;
  $: selectedCount = selected.size;
  // Grouping a selection that's exactly one existing group would change nothing
  $: canGroup = selected.size >= 2 && (selectionGroups.size > 1 || selectionHasUngrouped);
  $: canUngroup = selectionGroups.size > 0;

  interface GroupInfo {
    number: number;     // 1-based, in list order
    position: number;   // 1-based, within the group
    size: number;
  }
  $: groupInfo = getGroupInfo(tracks, groups);
  function getGroupInfo(list: PlaylistedTrack[], map: GroupMap) {
    const info = new Map<string, GroupInfo>();
    let number = 0;
    for (const block of toBlocks(list, map)) {
      if (map.has(block[0].id)) {
        number++;
        block.forEach((track, i) => info.set(track.id, { number, position: i + 1, size: block.length }));
      }
    }
    return info;
  }

  // The knob on a group's bracket toggles the whole group's selection
  function onGroupKnobClick(index: number) {
    toggleSelected(index);
    focusRow(index);
  }

  const newGroupId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  // Focus stays on the track it was on, wherever the change moved it
  function afterGroupsChange(focusedId: string, reordered: boolean) {
    clearSelection();
    dispatch("groupschange", { reordered });
    focusRow(tracks.findIndex((t) => t.id === focusedId));
  }

  // Non-adjacent tracks are pulled together at the first one's position
  export function groupSelection() {
    if (!canGroup) {
      return;
    }
    const focusedId = tracks[focusedIndex].id;
    const count = selected.size;
    const groupId = newGroupId();
    const next = new Map(groups);
    selected.forEach((id) => next.set(id, groupId));
    groups = next;

    const pulled = pullTogether(tracks, groups);
    const reordered = pulled.some((t, i) => t !== tracks[i]);
    tracks = pulled;
    trackListVirtualItems = $trackListVirtualizer.getVirtualItems();

    afterGroupsChange(focusedId, reordered);
    announce(`Grouped ${count} tracks`);
  }

  export function ungroupSelection() {
    if (!canUngroup) {
      return;
    }
    const dissolved = selectionGroups;
    groups = new Map([...groups].filter(([, group]) => !dissolved.has(group)));

    afterGroupsChange(tracks[focusedIndex].id, false);
    announce(dissolved.size === 1 ? "Ungrouped 1 group" : `Ungrouped ${dissolved.size} groups`);
  }

  // The track moves to just after its group, so the group never splits
  function removeFromGroup(index: number) {
    const track = tracks[index];
    const [, end] = blockRange(tracks, groups, index);
    const next = new Map(groups);
    next.delete(track.id);
    groups = pruneGroups(next);

    tracks.splice(index, 1);
    tracks.splice(end, 0, track);
    tracks = tracks;
    trackListVirtualItems = $trackListVirtualizer.getVirtualItems();

    afterGroupsChange(track.id, index !== end);
    announce(`Removed "${track.track.name}" from its group`);
  }

  export function clearSelectionFromToolbar() {
    clearSelection();
    focusRow(focusedIndex);
  }

  /* Drag feedback for groups. Rows draw their own drop line, but a row can't draw it for the
   * group it's in, nor fade the rest of a dragged group. */
  let dragSource: { start: number; end: number; index: number } | null = null;
  let groupDrop: { start: number; end: number; edge: Edge } | null = null;

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
      else if (key.toLowerCase() === "g") ungroupSelection();
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
      else if (key.toLowerCase() === "g") groupSelection();
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
    class="pl-3 focus-visible:outline-none [--ds-background-selected:hsl(var(--primary)/0.15)]"
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
        {@const group = groupInfo.get(item.id)}
        {@const blockStart = group ? virtItem.index - group.position + 1 : virtItem.index}
        <!-- Keyboard selection is handled by the listbox's keydown -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          data-track-index={virtItem.index}
          role="option"
          aria-selected={isSelected}
          aria-posinset={virtItem.index + 1}
          aria-setsize={tracks.length}
          aria-label={`${item.track.name} by ${item.track.artists[0].name}${group
            ? `, in group ${group.number}, track ${group.position} of ${group.size}`
            : ""}`}
          tabindex={virtItem.index === focusedIndex ? 0 : -1}
          on:click={(event) => onRowClick(event, virtItem.index)}
          class="relative grid select-none grid-cols-[1fr_2.2rem_15px] gap-3 border-b transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring {isSelected
            ? 'bg-primary/10 hover:bg-primary/15'
            : 'hover:bg-accent/60'} {dragSource &&
          virtItem.index !== dragSource.index &&
          virtItem.index >= dragSource.start &&
          virtItem.index <= dragSource.end
            ? 'opacity-40'
            : ''}"
        >
          {#if group}
            <!-- Group bracket in the list's left gutter, outside the row so it stays clear of the focus ring; joined across rows (the bottom border sits outside the row) -->
            <div
              class="pointer-events-none absolute -left-2 w-1 bg-primary/70 {group.position === 1
                ? 'top-3.5 rounded-t-full'
                : 'top-0'} {group.position === group.size ? 'bottom-1.5 rounded-b-full' : '-bottom-px'}"
              aria-hidden="true"
            ></div>
            {#if group.position === 1}
              <!-- Out of the Tab order like the ⋯ button: Space on any grouped row selects the group too.
                   It sits above the bracket's start, centred on it (bracket: -8px..-4px, knob: -10px..-2px),
                   leaving room in the 12px gutter for it to grow on hover without being clipped. -->
              <Tooltip.Root openDelay={300}>
                <Tooltip.Trigger asChild let:builder>
                  <button
                    {...builder}
                    use:builder.action
                    type="button"
                    tabindex={-1}
                    aria-label={`${isSelected ? "Deselect" : "Select"} group ${group.number}`}
                    on:click={() => onGroupKnobClick(virtItem.index)}
                    class="group/knob absolute -left-2.5 top-0 flex h-4 w-2 items-start justify-center pt-1"
                  >
                    <span
                      class="h-2 w-2 rounded-[3px] transition-transform group-hover/knob:scale-125 {isSelected
                        ? 'bg-primary'
                        : 'bg-primary/70 group-hover/knob:bg-primary'}"
                    ></span>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  Group {group.number} · {group.size} tracks · click to {isSelected ? "deselect" : "select"}
                </Tooltip.Content>
              </Tooltip.Root>
            {/if}
          {/if}
          {#if groupDrop && virtItem.index >= groupDrop.start && virtItem.index <= groupDrop.end}
            <div class="pointer-events-none absolute inset-0 bg-primary/5" aria-hidden="true"></div>
            {#if virtItem.index === (groupDrop.edge === "top" ? groupDrop.start : groupDrop.end)}
              <div
                class="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary {groupDrop.edge === 'top'
                  ? '-top-px'
                  : '-bottom-px'}"
                aria-hidden="true"
              ></div>
            {/if}
          {/if}
          <Track
            index={virtItem.index}
            track={tracks[virtItem.index].track}
            selected={isSelected}
            {blockStart}
            blockEnd={group ? blockStart + group.size - 1 : virtItem.index}
          />
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
              {#if group}
                <DropdownMenu.Separator />
                <DropdownMenu.Item on:click={() => removeFromGroup(virtItem.index)}>
                  Remove from group
                </DropdownMenu.Item>
              {/if}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/each}
    </div>
  </div>
</OverlayScrollbarsComponent>

<p id="track-list-help" class="sr-only">
  Use arrow keys to browse. Alt plus arrow keys moves the track. Space selects the track, Shift
  plus arrow keys extends the selection, Escape clears it. G groups the selected tracks, Shift plus G
  ungroups them. Enter opens track options.
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
