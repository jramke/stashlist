<script lang="ts">
    import '@repo/ui/globals.pcss';
    import '../app.pcss';

    import { onMount } from 'svelte';
    import { initStronghold } from '$lib/stronghold';
    import { getEnv } from '$lib/env';
    import { PUBLIC_STRONGHOLD_PASSWORD } from "$env/static/public";
  
    onMount(async () => {
        const pw = await getEnv('STRONGHOLD_PASSWORD');
        console.log(pw);
        console.log(PUBLIC_STRONGHOLD_PASSWORD);
        await initStronghold();
    });
</script>
  
<main>
    <slot />
</main>