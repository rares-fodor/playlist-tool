<script lang="ts">
    export let src: string | undefined;
    export let size: 'small' | 'medium' | 'large';

    function getSizeValue(size: string): string {
        const map: { [key: string]: string } = {
            small: '1em',
            medium: '2em',
            large: '6em'
        }
        return map[size] || '2em';
    }

    let sizeValue = getSizeValue(size);

</script>

<img src={src} alt="icon" style={`width: ${sizeValue}; height: ${sizeValue}`}/>

