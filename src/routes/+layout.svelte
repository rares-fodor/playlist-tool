<script lang="ts">
  import "../app.css";
  import "overlayscrollbars/styles/overlayscrollbars.css";
  import { ModeWatcher, setMode, userPrefersMode } from "mode-watcher";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import { ChevronDown, LogOut } from "lucide-svelte";

  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let logoutForm: HTMLFormElement;

  function onModeChange(value: string | undefined) {
    if (value === "light" || value === "dark" || value === "system") {
      setMode(value);
    }
  }
</script>

<ModeWatcher />

<a
  href="#main"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-md"
>
  Skip to content
</a>

<div class="flex min-h-dvh flex-col">
  <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
    <div class="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
      <a href="/playlist" class="rounded-sm text-lg font-semibold tracking-tight">
        Playlist Tool
      </a>

      {#if data.user}
        <div class="ml-auto">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <Button variant="ghost" builders={[builder]} class="gap-1">
                <span class="max-w-[12rem] truncate">{data.user.username}</span>
                <ChevronDown class="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="w-48">
              <DropdownMenu.Label>Theme</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={$userPrefersMode} onValueChange={onModeChange}>
                <DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="dark">Dark</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="system">System</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator />
              <DropdownMenu.Item on:click={() => logoutForm.requestSubmit()}>
                <LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
                Log out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <form bind:this={logoutForm} method="POST" action="/logout" hidden></form>
        </div>
      {/if}
    </div>
  </header>

  <main id="main" tabindex="-1" class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 focus-visible:outline-none">
    <slot />
  </main>
</div>
