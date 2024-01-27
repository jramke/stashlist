<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { page } from "$app/stores";

    export let path: string;
</script>

<Button variant="link" href={path} class={$page.url.pathname === path && 'underline'}>
    <slot/>
</Button>