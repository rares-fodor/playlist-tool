<script lang="ts">
  import { setMode, userPrefersMode } from "mode-watcher";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { shortcutsOpen } from "$lib/shortcuts";
  import { ChevronDown, Keyboard, LogOut } from "lucide-svelte";

  import type { User } from "lucia";

  export let user: User;
  export let avatarUrl: string | null;

  let className = "";
  export { className as class };

  let logoutForm: HTMLFormElement;

  function onModeChange(value: string | undefined) {
    if (value === "light" || value === "dark" || value === "system") {
      setMode(value);
    }
  }
</script>

<div class={className}>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button variant="ghost" builders={[builder]} class="gap-2 pl-1.5">
        <Avatar.Root class="h-7 w-7">
          <Avatar.Image src={avatarUrl} alt="" />
          <Avatar.Fallback class="text-xs font-medium" aria-hidden="true">
            {user.username.at(0)?.toUpperCase()}
          </Avatar.Fallback>
        </Avatar.Root>
        <span class="max-w-[12rem] truncate">{user.username}</span>
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
      <DropdownMenu.Item on:click={() => shortcutsOpen.set(true)}>
        <Keyboard class="mr-2 h-4 w-4" aria-hidden="true" />
        Keyboard shortcuts
      </DropdownMenu.Item>
      <DropdownMenu.Item on:click={() => logoutForm.requestSubmit()}>
        <LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
        Log out
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
  <form bind:this={logoutForm} method="POST" action="/logout" hidden></form>
</div>
