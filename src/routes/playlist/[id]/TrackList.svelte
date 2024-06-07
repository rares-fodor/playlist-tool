<script lang="ts">
    import Track from "./Track.svelte";
    import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
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

    let optionsDropdownState = new IdentifiableToggle();
    let selectedTrackState = new IdentifiableToggle();

    function onMoreOptionsClick(event: CustomEvent<{ trackId: string }>) {
        selectedTrackState.toggle(event.detail.trackId);
        optionsDropdownState.toggle(event.detail.trackId);
        selectedTrackState = selectedTrackState;
        optionsDropdownState = optionsDropdownState; // Force reactivity
    }

    const dispatch = createEventDispatcher<{
        endDrag: {}
    }>();

    let virtualItemElems: HTMLDivElement[] = [];
    let osRef: OverlayScrollbarsComponent | undefined;

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
</script>

{#if sortingEnabled}
<OverlayScrollbarsComponent
    bind:this={osRef}
    options={{
        scrollbars: {
            theme: 'os-theme-dark',
            autoHide: 'leave'
        }
    }}
    class="overflow-auto h-[750px]"
>
{#each tracks as pl_track, index (pl_track.track.id)}
    <div class="draggable">
        <Track
            on:moreOptions={onMoreOptionsClick}
            index={index}
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
