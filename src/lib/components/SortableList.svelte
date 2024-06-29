<script lang="ts">
  /* Minimal wrapper over sortablejs */

  import { createEventDispatcher, onMount } from "svelte";
  import Sortable from "sortablejs";

  import type { SortableEvent, Options } from "sortablejs";

  export let animation = 0;
  export let ghostClass = "";
  export let filter = ".ignore-elements";
  export let draggable = ".item";
  export let forceFallback = false;
  export let fallbackClass = "";
  export let fallbackTolerance = 0;
  export { className as class };

  export let list: HTMLElement;
  let options: Options;
  let className: string = "";

  let dispatch = createEventDispatcher<{
    endDrag: SortableEvent;
    startDrag: SortableEvent;
    // ... the other events (SortableList's events)
  }>();

  function onEnd(event: SortableEvent) {
    dispatch("endDrag", event);
  }
  function onStart(event: SortableEvent) {
    dispatch("startDrag", event);
  }
  // ... the other events (sortablejs' events)

  onMount(() => {
    options = {
      onEnd,
      onStart,
      ghostClass,
      animation,
      filter,
      draggable,
      forceFallback,
      fallbackClass,
      fallbackTolerance,
      // ... rest of the options
    };
    Sortable.create(list, { ...options });
  });
</script>

<div bind:this={list} class={className}>
  <slot />
</div>
