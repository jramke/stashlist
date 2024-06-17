<script lang="ts">
    import '@repo/ui/globals.pcss';
    import '../app.pcss';

    import { onMount } from 'svelte';
    import { initStronghold } from '$lib/stronghold';
  
    onMount(async () => {
        await initStronghold();
    });
</script>
  
<main>
    <slot />
</main>