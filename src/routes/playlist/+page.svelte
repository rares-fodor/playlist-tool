<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import MaterialSymbolsMoreHoriz from "~icons/material-symbols/more-horiz";
  import { Eye } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<main class="grid">
  <div class="mx-auto lg:min-w-[59rem]">
    <ul aria-label="Playlists" class="p-0 list-none">
      {#each data.playlists as playlist}
        <div
          class="flex w-full pr-1 border-b border-b-gray-300 hover:bg-gray-200"
        >
          <li class="flex-1">
            <a href={`/playlist/${playlist.id}`}>
              <div class="flex align-middle gap-3 py-1">
                <Icon size="medium" src={playlist.images[0].url} />
                <div class="flex items-center">
                  <span>{playlist.name}</span>
                </div>
              </div>
            </a>
          </li>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <div class="flex items-center">
                <Button size="icon" variant="outline" class="h-8 w-8">
                  <MaterialSymbolsMoreHoriz
                    style="width: 2em; height: 2em;"
                    class={`text-gray-700 hover:text-black`}
                  />
                </Button>
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="left" align="start">
              <DropdownMenu.Group>
                <DropdownMenu.Label>Playlist options</DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Item class="flex items-center">
                  <Eye class="mr-2 size-4" />
                  <span>Hide</span>
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/each}
    </ul>
  </div>
</main>
