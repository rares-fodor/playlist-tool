<script lang="ts">
    import Icon from "$lib/components/Icon.svelte";

    import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
    import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
    import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
    import { onMount, createEventDispatcher } from "svelte";

    import type { TrackItem } from '$lib/api_types'

    type DragState = 'idle' | 'is-dragging-over' | 'is-dragging' | 'preview';

    const stateStyles: { [Key in DragState]?: string } = {
        'is-dragging': 'opacity-40',
        'is-dragging-over': 'bg-slate-300'
    }

    export { className as class };
    export let track: TrackItem;
    export let index: number;

    let className: string;
    let element: HTMLElement;

    let state: DragState = 'idle';

    let trackData: {
        index: number,
    } = {
        index: index
    }

    onMount(() => {
        return combine(
            draggable({
                element,
                getInitialData: () => { return trackData },
                onDragStart: () => state = 'is-dragging',
                onDrop: () => state = 'idle',
            }),
            dropTargetForElements({
                element,
                getData({ input }) {
                    return attachClosestEdge({ index }, {
                        element,
                        input,
                        allowedEdges: ['top', 'bottom']
                    });
                },
                onDragEnter: () => {
                    if (state !== 'is-dragging') {
                        state = 'is-dragging-over'
                    }
                },
                onDragLeave: () => {
                    if (state !== 'is-dragging') {
                        state = 'idle'
                    }
                },
                onDrop: () => {
                    state = 'idle';
                },
                onDrag: ({ self, source }) => {
                    if (source.element === element) {
                        return;
                    }
                    console.log(source.data.index);
                },
            })
        )
    })

    const dispatch = createEventDispatcher<{
        moreOptions: { trackId: string }
    }>();

    function moreOptions() {
        dispatch('moreOptions', { trackId: track.id });
    }

    let name = track.name;
    let artists = track.artists;
    let album = track.album;

    // Spotify states the url field is not nullable but some albums DO have missing album covers
    let imageUrl = album.images[0]?.url ?? `https://placehold.co/300?text=${album.name.at(0)}`;

</script>

<button class={`${className} w-full text-left ${stateStyles[state] ?? ''}`} on:click={moreOptions} bind:this={element}>
<div class="grid grid-cols-[1fr_1fr_2rem] border-b border-b-gray-400 py-1 group">
    <div class="flex min-w-0 items-center max-h-9 gap-2">
        <Icon size="medium" src={imageUrl}/>
        <div class="flex flex-col justify-center whitespace-nowrap overflow-hidden">
            <section class="overflow-hidden overflow-ellipsis text-base/tight">{name}</section>
            <section class="overflow-hidden overflow-ellipsis text-sm/tight">{artists[0].name}</section>
        </div>
    </div>
    <div class="flex items-center text-sm overflow-hidden whitespace-nowrap overflow-ellipsis">
        {album.name}
    </div>
</div>
</button>
