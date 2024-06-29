<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";

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
    "is-dragging-over": "bg-gray-200",
  };

  export let track: TrackItem;
  export let index: number;

  let element: HTMLElement;

  let state: DragState = "idle";

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
        onDragEnter: () => {
          if (state !== "is-dragging") {
            state = "is-dragging-over";
          }
        },
        onDragLeave: () => {
          if (state !== "is-dragging") {
            state = "idle";
          }
        },
        onDrop: () => {
          state = "idle";
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
  class={`grid grid-cols-[3rem_1fr_1fr_3rem] gap-3 py-1 group ${stateStyles[state] ?? ""}`}
>
  <div class="flex items-center justify-end">
    <span>{index}</span>
  </div>
  <div class="flex min-w-0 items-center max-h-11 gap-2">
    <Icon size="medium" src={imageUrl} />
    <div class="flex flex-col justify-center whitespace-nowrap overflow-hidden">
      <section class="overflow-hidden overflow-ellipsis text-base/tight">
        {name}
      </section>
      <section class="overflow-hidden overflow-ellipsis text-sm/tight">
        {artists[0].name}
      </section>
    </div>
  </div>
  <div class="flex items-center text-sm overflow-hidden">
    <span class="whitespace-nowrap overflow-ellipsis overflow-hidden"
      >{album.name}</span
    >
  </div>
  <div class="flex items-center text-sm justify-end">
    <span>{duration}</span>
  </div>
</div>
