<script lang="ts">
    import SortableList from "$lib/components/SortableList.svelte";
    import Track from "./Track.svelte";
    import type { SortableEvent } from "sortablejs";
    import type { PlaylistedTrack } from "$lib/api_types";

    import { createEventDispatcher } from "svelte";
    import { createVirtualizer } from "@tanstack/svelte-virtual";

    export let tracks: PlaylistedTrack[];
    export let sortingEnabled: boolean;

    class IdentifiableToggle {
        value: boolean;
        id: string | undefined;

        constructor() {
            this.value = false;
            this.id = undefined;
        }
        isActive(id: string): boolean {
            return this.value && this.id === id;
        }
        toggle(id: string) {
            if (this.id === id) {
                this.value = !this.value;
            } else {
                this.id = id;
                this.value = true;
            }
        }
        deactivate() {
            this.value = false;
        }
    }

    let ghostClass = "bg-gray-200";

    let optionsDropdownState = new IdentifiableToggle();
    let selectedTrackState = new IdentifiableToggle();

    function onMoreOptionsClick(event: CustomEvent<{ trackId: string }>) {
        selectedTrackState.toggle(event.detail.trackId);
        optionsDropdownState.toggle(event.detail.trackId);
        selectedTrackState = selectedTrackState;
        optionsDropdownState = optionsDropdownState; // Force reactivity
    }

    async function startDragHandler(event: CustomEvent<SortableEvent>) {
        optionsDropdownState.value = false;
        selectedTrackState.deactivate();

        // Updating the state object for the selected will cause a redraw overwriting ghostClass
        // if the element is also the one being dragged. When it is not, the state is only reflected when dragging stops.
        // This allows toggled elements, not being dragged to be redrawn.
        // NOTE: oldIndex is a bit of a hack here, SortableJS doesn't define oldDraggableIndex for the onStart event.
        //       That means it also counts the drop-down as a member of the list messing up the indexes a bit.
        const oldIndex = event.detail.oldIndex;

        if (oldIndex !== undefined && selectedTrackState.id !== undefined) {
            if (tracks[oldIndex] === undefined || tracks[oldIndex].track.id !== selectedTrackState.id) {
                selectedTrackState.value = false;
            }
        }
    }

    const dispatch = createEventDispatcher<{
        endDrag: {
            oldIndex: number | undefined,
            newIndex: number | undefined
        }
    }>();

    // Minimal interface
    function endDrag(event: CustomEvent<SortableEvent>) {
        dispatch('endDrag', {
            oldIndex: event.detail.oldDraggableIndex,
            newIndex: event.detail.newDraggableIndex
        });
    }

    let virtualListElem: HTMLDivElement;
    let virtualItemElems: HTMLDivElement[] = [];
    $: virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: tracks.length,
        getScrollElement: () => virtualListElem,
        estimateSize: () => 70,
        overscan: 5,
    })

    $: virtualItems = $virtualizer.getVirtualItems();
    $: {
        if (virtualItemElems.length) {
            virtualItemElems.forEach((elem) => $virtualizer.measureElement(elem));
        }
    }

</script>


{#if sortingEnabled}
<SortableList
    on:endDrag={endDrag}
    on:startDrag={startDragHandler}
    animation={150}
    ghostClass={ghostClass}
    draggable=".draggable"
>
    {#each tracks as pl_track (pl_track.track.id)}
        <div class="draggable">
            <Track
                on:moreOptions={onMoreOptionsClick}
                track={pl_track.track}
                class={`${selectedTrackState.isActive(pl_track.track.id) ? 'bg-gray-200' : ''}`}
            />
            {#if optionsDropdownState.isActive(pl_track.track.id)}
                <div class="flex flex-col gap-1 bg-gray-200 border-b-gray-400 border-b">
                    <button class="hover:underline text-sm">Insert track below...</button>
                </div>
            {/if}
        </div>
    {/each}
</SortableList>

{:else}

{#key tracks}
<div bind:this={virtualListElem} class="h-[750px] w-full overflow-auto">
<div style="position: relative; height: {$virtualizer.getTotalSize()}px; width: 100%;">
    <div
        style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY({virtualItems[0] ? virtualItems[0].start : 0}px);"
    >
        {#each virtualItems as row, index (row.index)}
            <div bind:this={virtualItemElems[index]} data-index={row.index} >
                <Track
                    on:moreOptions={onMoreOptionsClick}
                    track={tracks[row.index].track}
                    class={`${selectedTrackState.isActive(tracks[row.index].track.id) ? 'bg-gray-200' : ''}`}
                />
                {#if optionsDropdownState.isActive(tracks[row.index].track.id)}
                    <div class="flex flex-col gap-1 bg-gray-200 border-b-gray-400 border-b">
                        <button class="hover:underline text-sm">Insert track below...</button>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>
</div>
{/key}
{/if}

