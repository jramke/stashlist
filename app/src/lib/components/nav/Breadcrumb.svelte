<script lang="ts">
    export let path: string[];

</script>

<p class="mb-5 flex gap-2 items-center">
    {#each path as item, i}
        {#if i === path.length - 1}
            <span class="font-bold">
                {item}
            </span>
        {:else}
        <span class="text-muted-foreground">{item}</span>
        <span class="text-muted-foreground">/</span>
        {/if}
    {/each}
</p>