<script lang="ts">
  import "../app.css";
  import "overlayscrollbars/styles/overlayscrollbars.css";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "$lib/components/ui/sonner";
  import ShortcutsDialog from "$lib/components/ShortcutsDialog.svelte";
  import { isTextInput, shortcutsOpen } from "$lib/shortcuts";

  function onWindowKeydown(event: KeyboardEvent) {
    if (
      event.key !== "?" ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.defaultPrevented ||
      isTextInput(event.target)
    ) {
      return;
    }
    event.preventDefault();
    shortcutsOpen.set(true);
  }
</script>

<svelte:window on:keydown={onWindowKeydown} />

<ModeWatcher />
<Toaster />
<ShortcutsDialog />

<main class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4">
  <slot />
</main>
