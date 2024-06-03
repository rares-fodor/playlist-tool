<script lang="ts">
    import SortableList from "$lib/components/SortableList.svelte";
    import Track from "./Track.svelte";
    import type { SortableEvent } from "sortablejs";

    import { createEventDispatcher } from "svelte";

    export let tracks;

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

    async function startDragHandler() {
        optionsDropdownState.value = false;
        selectedTrackState.deactivate();
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

</script>


<SortableList
    on:endDrag={endDrag}
    on:startDrag={startDragHandler}
    animation={150}
    ghostClass={ghostClass}
    filter=".non-draggable"
    draggable=".draggable"
>
    {#key tracks}
    {#each tracks as pl_track}
        <Track
            on:moreOptions={onMoreOptionsClick}
            track={pl_track.track}
            class={`draggable ${selectedTrackState.isActive(pl_track.track.id) ? 'bg-gray-200' : ''}`}
        />
        {#if optionsDropdownState.isActive(pl_track.track.id)}
            <div class="non-draggable flex flex-col gap-1 bg-gray-200 border-b-gray-400 border-b">
                <button class="hover:underline text-sm">Insert track below...</button>
            </div>
        {/if}
    {/each}
    {/key}
</SortableList>
