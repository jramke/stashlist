<script>

    import { onMount } from 'svelte';

    let ahoy;
    onMount(async () => {
        ahoy = await import('ahoy.js');
        console.log(ahoy);
    })
</script>