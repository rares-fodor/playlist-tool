<script lang="ts">
  import { page } from "$app/stores";
</script>

<div class="flex flex-col justify-center min-h-screen">
  <p class="text-center text-3xl">{$page.status} | {$page.error?.message}</p>
</div>
