<script lang="ts">
    import Track from "./Track.svelte";
    import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
    import type { PlaylistedTrack } from "$lib/api_types";

    import { onMount } from "svelte";
    import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
    import { createVirtualizer } from "@tanstack/svelte-virtual";
    import { isTrackData } from "./track-data";
    import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
    import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types/"
    import type { EventListenerArgs } from "overlayscrollbars"

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

    export let tracks: PlaylistedTrack[];
    export let sortingEnabled: boolean;

    let optionsDropdownState = new IdentifiableToggle();
    let selectedTrackState = new IdentifiableToggle();

    function onMoreOptionsClick(event: CustomEvent<{ trackId: string }>) {
        selectedTrackState.toggle(event.detail.trackId);
        optionsDropdownState.toggle(event.detail.trackId);
        selectedTrackState = selectedTrackState;
        optionsDropdownState = optionsDropdownState; // Force reactivity
    }

    let virtualItemElems: HTMLDivElement[] = [];
    let osRef: OverlayScrollbarsComponent | undefined;

    $: scrollViewport = osRef?.osInstance()?.elements().viewport

    $: virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: tracks.length,
        // @ts-ignore: Assign HTMLElement | undefined to HTMLDivElement | null
        getScrollElement: () => osRef?.osInstance()?.elements().viewport,
        estimateSize: () => 70,
        overscan: 10
    })

    $: virtualItems = $virtualizer.getVirtualItems();
    $: {
        if (virtualItemElems.length) {
            virtualItemElems.forEach((elem) => $virtualizer.measureElement(elem));
        }
    }

    let scrollTop: number | undefined = 0;
    let scrollLeft: number | undefined = 0;
    let moved: boolean = false;

    onMount(() => {
        return monitorForElements({
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

                const closestEdge = sourceIndex > targetIndex ? 'top' as Edge : 'bottom' as Edge;

                tracks = reorderWithEdge({
                    list: tracks,
                    startIndex: sourceIndex,
                    indexOfTarget: targetIndex,
                    closestEdgeOfTarget: closestEdge,
                    axis: 'vertical',
                })

                scrollTop = scrollViewport?.scrollTop
                scrollLeft = scrollViewport?.scrollLeft
                moved = true;
            },
        })
    })

    // Moved is toggled in onDrop
    // Changing the track list causes a redraw of the overlayscrollbar div, causeing it to reset the scroll amount.
    // Saving this restores the saved scroll state
    function onScroll() {
        if (moved && scrollViewport) {
            scrollViewport.scrollTop = scrollTop ?? 0;
            moved = false;
        }
    }

</script>

{#if sortingEnabled}
<OverlayScrollbarsComponent
    bind:this={osRef}
    options={{
        scrollbars: {
            theme: 'os-theme-dark',
            autoHide: 'leave'
        },
    }}
    on:osScroll={onScroll}
    on:osUpdated={() => console.log("updated")}
    class="overflow-auto h-[750px]"
>
{#each tracks as pl_track, index (`${pl_track.track.id}:${index}`)}
    <div class="draggable">
        <Track
            index={index}
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
</OverlayScrollbarsComponent>
{/if}

<style>
    :global(.os-theme-dark) {
        --os-size: 15px;
        --os-handle-border-radius: 0px;
    }
</style>
