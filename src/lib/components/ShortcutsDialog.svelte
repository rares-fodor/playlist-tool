<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { shortcutsOpen } from "$lib/shortcuts";

  interface Shortcut {
    // Each entry is one alternative; keys within an entry are pressed together
    keys: string[][];
    action: string;
  }

  const groups: { title: string; shortcuts: Shortcut[] }[] = [
    {
      title: "Track list",
      shortcuts: [
        { keys: [["↑"], ["↓"]], action: "Previous / next track" },
        { keys: [["Home"], ["End"]], action: "First / last track" },
        { keys: [["PgUp"], ["PgDn"]], action: "Up / down one page" },
        { keys: [["Alt", "↑"], ["Alt", "↓"]], action: "Move track up / down" },
        { keys: [["Alt", "Home"], ["Alt", "End"]], action: "Move track to top / bottom" },
        { keys: [["Enter"], ["Shift", "F10"]], action: "Track options" },
        { keys: [["Esc"]], action: "Close menu" },
      ],
    },
    {
      title: "General",
      shortcuts: [{ keys: [["?"]], action: "Show keyboard shortcuts" }],
    },
  ];
</script>

<Dialog.Root bind:open={$shortcutsOpen}>
  <Dialog.Content class="max-h-[90dvh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Keyboard shortcuts</Dialog.Title>
      <Dialog.Description>On a Mac, use Option (⌥) for Alt.</Dialog.Description>
    </Dialog.Header>
    {#each groups as group}
      <section>
        <h3 class="mb-2 text-sm font-medium">{group.title}</h3>
        <dl class="divide-y text-sm">
          {#each group.shortcuts as shortcut}
            <div class="flex items-center justify-between gap-4 py-2">
              <dt class="text-muted-foreground">{shortcut.action}</dt>
              <dd class="flex shrink-0 items-center gap-1">
                {#each shortcut.keys as combo, i}
                  {#if i > 0}<span class="text-muted-foreground">/</span>{/if}
                  {#each combo as key, j}
                    {#if j > 0}<span class="text-muted-foreground" aria-hidden="true">+</span>{/if}
                    <kbd
                      class="min-w-[1.75rem] rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-xs"
                    >
                      {key}
                    </kbd>
                  {/each}
                {/each}
              </dd>
            </div>
          {/each}
        </dl>
      </section>
    {/each}
  </Dialog.Content>
</Dialog.Root>
