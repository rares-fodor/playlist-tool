<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import MaterialSymbolsDragIndicator from "~icons/material-symbols/drag-indicator";

  import {
    draggable,
    dropTargetForElements,
  } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
  import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
  import { onMount } from "svelte";
  import { getTrackData, isTrackData } from "./track-data";

  import type { TrackItem } from "$lib/api_types";

  type DragState = "idle" | "is-dragging-over" | "is-dragging" | "preview";

  const stateStyles: { [Key in DragState]?: string } = {
    "is-dragging": "opacity-40",
    "is-dragging-over": "bg-primary/5",
  };

  export let track: TrackItem;
  export let index: number;

  let element: HTMLElement;

  let state: DragState = "idle";
  // Visual only: mirrors the edge TrackList's onDrop infers from the drag direction
  let dropEdge: "top" | "bottom" | undefined;

  onMount(() => {
    return combine(
      draggable({
        element,
        getInitialData: () => {
          return getTrackData(index);
        },
        onDragStart: () => (state = "is-dragging"),
        onDrop: () => (state = "idle"),
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if (source.element === element) {
            return false;
          }
          return isTrackData(source.data);
        },
        getData: () => {
          return getTrackData(index);
        },
        onDragEnter: ({ source }) => {
          if (state !== "is-dragging") {
            state = "is-dragging-over";
            if (isTrackData(source.data)) {
              dropEdge = source.data.trackIndex > index ? "top" : "bottom";
            }
          }
        },
        onDragLeave: () => {
          if (state !== "is-dragging") {
            state = "idle";
            dropEdge = undefined;
          }
        },
        onDrop: () => {
          state = "idle";
          dropEdge = undefined;
        },
      }),
    );
  });

  let name = track.name;
  let artists = track.artists;
  let album = track.album;

  const durationDate = new Date(track.duration_ms);
  const mins = durationDate.getMinutes();
  const seconds = durationDate.getSeconds();
  let duration;
  if (seconds < 10) {
    duration = `${mins}:0${seconds}`;
  } else {
    duration = `${mins}:${seconds}`;
  }

  // Spotify states the url field is not nullable but some albums DO have missing album covers
  let imageUrl =
    album.images[0]?.url ?? `https://placehold.co/300?text=${album.name.at(0)}`;
</script>

<div
  bind:this={element}
  class={`relative grid grid-cols-[3.5rem_1fr] sm:grid-cols-[3.5rem_1fr_1fr_3rem] gap-3 py-1 group cursor-grab active:cursor-grabbing ${stateStyles[state] ?? ""}`}
>
  {#if state === "is-dragging-over" && dropEdge}
    <div
      class="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary {dropEdge === 'top' ? '-top-px' : '-bottom-px'}"
      aria-hidden="true"
    ></div>
  {/if}
  <div class="flex items-center justify-end gap-1 text-sm tabular-nums text-muted-foreground">
    <MaterialSymbolsDragIndicator
      class="h-4 w-4 shrink-0 opacity-40 transition-opacity group-hover:opacity-100"
      aria-hidden="true"
    />
    <span>{index}</span>
  </div>
  <div class="flex min-w-0 items-center max-h-11 gap-2">
    <Icon size="medium" src={imageUrl} />
    <div class="flex flex-col justify-center whitespace-nowrap overflow-hidden">
      <section class="overflow-hidden overflow-ellipsis text-base/tight">
        {name}
      </section>
      <section class="overflow-hidden overflow-ellipsis text-sm/tight text-muted-foreground">
        {artists[0].name}
      </section>
    </div>
  </div>
  <div class="hidden sm:flex items-center text-sm text-muted-foreground overflow-hidden">
    <span
      class="whitespace-nowrap overflow-ellipsis overflow-hidden"
    >
      {album.name}
    </span>
  </div>
  <div class="hidden sm:flex items-center text-sm tabular-nums text-muted-foreground justify-end">
    <span>{duration}</span>
  </div>
</div>
