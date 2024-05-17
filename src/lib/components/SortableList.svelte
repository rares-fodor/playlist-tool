<script lang="ts">
    /* Minimal wrapper over sortablejs */

    import { createEventDispatcher, onMount } from 'svelte';
    import Sortable from 'sortablejs';

    import type { SortableEvent, Options } from 'sortablejs';

    let list: HTMLElement;
    let options: Options;
    let className: string;

    export { className as class }
    export let animation = 0;


    let dispatch = createEventDispatcher<{
        onEnd: SortableEvent,
        onStart: SortableEvent,
        // ... the other events (SortableList's events)
    }>();

    function onEnd(event: SortableEvent) {
        dispatch('onEnd', event);
    }
    function onStart(event: SortableEvent) {
        dispatch('onStart', event);
    }
    // ... the other events (sortablejs' events)


    onMount(() => {
        options = {
            onEnd,
            onStart,
            animation,
            // ... rest of the options
        }
        Sortable.create(list, {...options})
    })

</script>


<div bind:this={list} class={className}>
    <slot/>
</div>
