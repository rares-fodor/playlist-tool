<script lang="ts">
    export let src: string;
    export let size: string = "2em";
</script>

<img src={src} alt="icon" style={`height: ${size}; width: ${size}`}>

