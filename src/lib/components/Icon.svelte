<script lang="ts">
  import { cn } from "$lib/utils";

  export let src: string | undefined;
  export let size: "small" | "medium" | "large";
  // Covers sit next to their title, so they're decorative by default
  export let alt = "";
  let className: string | undefined = undefined;
  export { className as class };

  function getSizeValue(size: string): string {
    const map: { [key: string]: string } = {
      small: "1em",
      medium: "2em",
      large: "6em",
    };
    return map[size] || "2em";
  }

  let sizeValue = getSizeValue(size);
</script>

<img
  {src}
  {alt}
  class={cn("shrink-0 rounded-sm object-cover", className)}
  style={`width: ${sizeValue}; height: ${sizeValue}`}
/>
