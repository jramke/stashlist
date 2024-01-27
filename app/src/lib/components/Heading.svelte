<script lang="ts">
    export let tag = 'h2';
</script>

<svelte:element this={tag} class="mb-6">
    <slot />
</svelte:element>
