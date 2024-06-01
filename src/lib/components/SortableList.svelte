<script lang="ts">
    /* Minimal wrapper over sortablejs */

    import { createEventDispatcher, onMount } from 'svelte';
    import Sortable from 'sortablejs';

    import type { SortableEvent, Options } from 'sortablejs';

    let list: HTMLElement;
    let options: Options;

    export let animation = 0;
    export let ghostClass = "";


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
            ghostClass,
            // ... rest of the options
        }
        Sortable.create(list, {...options})
    })

</script>


<div bind:this={list}>
    <slot/>
</div>
