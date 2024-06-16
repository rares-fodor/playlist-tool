<script lang="ts">
    export let enabled: boolean = true;
    export { className as class };

    let className: string = "";
    className = `${className} p-1 bg-gray-200`
    $: {
        if (enabled) {
            className = `${className} hover:bg-gray-300`
        } else {
            className = `${className} opacity-50 cursor-not-allowed`
        }
    }
</script>

<button class={className} on:click>
    <slot />
</button>
