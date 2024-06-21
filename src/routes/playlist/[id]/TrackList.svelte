<script lang="ts">
    import Track from "./Track.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
    import type { PlaylistedTrack } from "$lib/api_types";

    import * as Dialog from "$lib/components/ui/dialog";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
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
    import { Description } from "$lib/components/ui/alert-dialog";

    export let tracks: PlaylistedTrack[];

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

    let trackSelectDialogOpen = false;
    let trackSelectSearchValue: string = "";
    let trackSelectDescription: string = ""; 
    let trackSelectTracks: PlaylistedTrack[] = tracks;
    let handleTrackSelect: (index: number) => void;

    function handleInsert(event: CustomEvent<{side: 'above' | 'below', index: number }>) {
        handleTrackSelect = (originIndex: number) => {
            let targetIndex = event.detail.index;

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

            virtualItems = $virtualizer.getVirtualItems();
        }

        const track = tracks[event.detail.index].track
        trackSelectDescription = 
            `Selected track will be moved ${event.detail.side} "${track.artists[0].name} - ${track.name}"`

        trackSelectDialogOpen = true;
    }

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
    style="position: relative; width: 100%; height: {$virtualizer.getTotalSize()}px;"
>
    <div
        style="position: abosolute; top: 0; left: 0; width: 100%; transform: translateY({virtualItems[0] ? virtualItems[0].start : 0}px);"
    >
        {#each virtualItems as virtItem (`${tracks[virtItem.index].track.id}:${virtItem.index}`)}
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
        <ScrollArea>
            <div class="flex flex-col gap-1 h-[350px]">
                {#each trackSelectTracks as track, index}
                    <button
                        on:click={() => { handleTrackSelect?.(index); trackSelectDialogOpen = false }}
                    >
                        <div class="flex items-center gap-2 p-1">
                            <Icon size="medium" src={track.track.album.images[0].url}/>
                            <span>{track.track.name}</span>
                        </div>
                    </button>
                {/each}
            </div>
        </ScrollArea>
    </Dialog.Content>
</Dialog.Root>


<style>
    :global(.os-theme-dark) {
        --os-size: 15px;
        --os-handle-border-radius: 0px;
    }
</style>
