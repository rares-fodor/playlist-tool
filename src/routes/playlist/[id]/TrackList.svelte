<script lang="ts">
    import Track from "./Track.svelte";
    import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
    import type { PlaylistedTrack } from "$lib/api_types";

    import { onMount } from "svelte";
    import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
    import { createVirtualizer } from "@tanstack/svelte-virtual";
    import { isTrackData } from "./track-data";
    import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
    import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
    import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
    import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash"
    import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types/";

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

    // Prevents reinitialization of virtualizer when tracks changes
    let count: number = tracks.length;

    $: virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
        count,
        // @ts-ignore: Assign HTMLElement | undefined to HTMLDivElement | null
        getScrollElement: () => osRef?.osInstance()?.elements().viewport,
        estimateSize: () => 44,
        overscan: 5
    })

    $: virtualItems = $virtualizer.getVirtualItems();
    $: {
        if (virtualItemElems.length) {
            virtualItemElems.forEach((elem) => $virtualizer.measureElement(elem));
        }
    }

    onMount(() => {
        return combine(
            monitorForElements({
                canMonitor({ source }) {
                    console.log(isTrackData);
                    return isTrackData(source.data);
                },
                onDrag() {
                    // When drag starts we should collapse open drop-downs and unselect their parent tracks
                    if (optionsDropdownState.value) {
                        optionsDropdownState.deactivate();
                        optionsDropdownState = optionsDropdownState;
                    }
                    if (selectedTrackState.value) {
                        selectedTrackState.deactivate();
                        selectedTrackState = selectedTrackState;
                    }
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

                    virtualItems = $virtualizer.getVirtualItems();

                    setTimeout(() => {
                        const element = document.querySelector(`[data-track-index="${targetData.trackIndex}"]`)
                        if (element instanceof HTMLElement) {
                            triggerPostMoveFlash(element);
                        }
                    }, 50)
                }
            }),
            autoScrollForElements({
                element: osRef?.osInstance()?.elements().viewport!,
            }),
        )
    })
</script>

<OverlayScrollbarsComponent
    bind:this={osRef}
    options={{
        scrollbars: {
            theme: 'os-theme-dark',
            autoHide: 'leave'
        },
    }}
    class="overflow-y-auto h-[750px] contain-strict"
>
<div
    style="position: relative; width: 100%; height: {$virtualizer.getTotalSize()}px;"
>
    <div
        style="position: abosolute; top: 0; left: 0; width: 100%; transform: translateY({virtualItems[0] ? virtualItems[0].start : 0}px);"
    >
        {#each virtualItems as virtItem (`${tracks[virtItem.index].track.id}:${virtItem.index}`)}
            <div data-track-index={virtItem.index}>
                <Track
                    index={virtItem.index}
                    on:moreOptions={onMoreOptionsClick}
                    track={tracks[virtItem.index].track}
                    class={`${selectedTrackState.isActive(tracks[virtItem.index].track.id) ? 'bg-gray-200' : ''}`}
                />
                {#if optionsDropdownState.isActive(tracks[virtItem.index].track.id)}
                    <div class="flex flex-col gap-1 bg-gray-200 border-b-gray-400 border-b">
                        <button class="hover:underline text-sm">Insert track below...</button>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>
</OverlayScrollbarsComponent>

<style>
    :global(.os-theme-dark) {
        --os-size: 15px;
        --os-handle-border-radius: 0px;
    }
</style>
