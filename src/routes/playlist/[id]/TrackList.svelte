<script lang="ts">
    import Track from "./Track.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
    import type { PlaylistedTrack } from "$lib/api_types";

    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";

    import { onMount } from "svelte";
    import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
    import { createVirtualizer } from "@tanstack/svelte-virtual";
    import { isTrackData } from "./track-data";
    import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
    import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
    import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
    import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash"
    import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types/";

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
        overscan: 5
    })

    $: trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
    $: {
        if (virtualItemElems.length) {
            virtualItemElems.forEach((elem) => $trackListVirtualizer.measureElement(elem));
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

                    const closestEdge = sourceIndex > targetIndex ? 'top' as Edge : 'bottom' as Edge;

                    tracks = reorderWithEdge({
                        list: tracks,
                        startIndex: sourceIndex,
                        indexOfTarget: targetIndex,
                        closestEdgeOfTarget: closestEdge,
                        axis: 'vertical',
                    })

                    trackListVirtualItems = $trackListVirtualizer.getVirtualItems();

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

    let trackSelectDialogOpen = false;
    let trackSelectSearchValue: string = "";
    let trackSelectDescription: string = ""; 
    let trackSelectTracks: PlaylistedTrack[] = tracks;
    let handleTrackSelect: (id: string) => void;
    function handleInsert(event: CustomEvent<{side: 'above' | 'below', index: number }>) {
        handleTrackSelect = (id: string) => {
            let targetIndex = event.detail.index;
            let originIndex = tracks.findIndex(track => track.id === id)
            console.log(tracks.map(t => t.id))
            console.log(id, originIndex)

            if (event.detail.side === "above" && originIndex < targetIndex) {
                targetIndex--;
            } else if (event.detail.side === "below" && originIndex > targetIndex) {
                targetIndex++;
            }

            const elem = tracks[originIndex];
            tracks.splice(originIndex, 1);
            tracks.splice(targetIndex, 0, elem);

            setTimeout(() => {
                const element = document.querySelector(`[data-track-index="${targetIndex}"]`)
                if (element instanceof HTMLElement) {
                    triggerPostMoveFlash(element);
                }
            }, 150)

            trackListVirtualItems = $trackListVirtualizer.getVirtualItems();
        }

        const track = tracks[event.detail.index].track
        trackSelectDescription = 
            `Selected track will be moved ${event.detail.side} "${track.artists[0].name} - ${track.name}"`

        trackSelectDialogOpen = true;
    }

    let trackSelectScrollRef: OverlayScrollbarsComponent | undefined;
    $: trackSelectVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: trackSelectTracks.length,
        // @ts-ignore: Assign HTMLElement | undefined to HTMLDivElement | null
        getScrollElement: () => trackSelectScrollRef?.osInstance()?.elements().viewport,
        estimateSize: () => 45,
        overscan: 5
    })
    $: trackSelectVirtualItems = $trackSelectVirtualizer.getVirtualItems();
    $: {
        if (trackSelectSearchValue === "") {
            trackSelectTracks = tracks;
        } else {
            const searchValueNormalized = trackSelectSearchValue.toLocaleLowerCase().replace('/\s+g', '');
            trackSelectTracks = tracks.filter(track => {
                const trackNameNormalized = track.track.name.toLowerCase().replace('/s\+g', '');
                return trackNameNormalized.includes(searchValueNormalized, 0)
            })
        }
    }

</script>

<OverlayScrollbarsComponent
    bind:this={osRef}
    options={{
        scrollbars: {
            theme: 'os-theme-dark',
            autoHide: 'scroll'
        },
    }}
    class="h-[650px]"
>
<div
    style="position: relative; width: 100%; height: {$trackListVirtualizer.getTotalSize()}px;"
>
    <div
        style="position: abosolute; top: 0; left: 0; width: 100%; transform: translateY({trackListVirtualItems[0] ? trackListVirtualItems[0].start : 0}px);"
    >
        {#each trackListVirtualItems as virtItem (tracks[virtItem.index])}
            <div data-track-index={virtItem.index}>
                <Track
                    index={virtItem.index}
                    track={tracks[virtItem.index].track}
                    on:insert={handleInsert}
                />
            </div>
        {/each}
    </div>
</div>
</OverlayScrollbarsComponent>

<Dialog.Root bind:open={trackSelectDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Select a track</Dialog.Title>
            <Dialog.Description>{trackSelectDescription}</Dialog.Description>
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
                    theme: 'os-theme-dark',
                }
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
                            on:click={() => { handleTrackSelect?.(trackSelectTracks[virtItem.index].id); trackSelectDialogOpen = false }}
                        >
                            <div class="flex items-center gap-2 p-1">
                                <Icon size="medium" src={trackSelectTracks[virtItem.index].track.album.images[0].url}/>
                                <span>{trackSelectTracks[virtItem.index].track.name}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        </OverlayScrollbarsComponent>
    </Dialog.Content>
</Dialog.Root>


<style>
    :global(.os-theme-dark) {
        --os-size: 15px;
        --os-handle-border-radius: 0px;
    }
</style>
