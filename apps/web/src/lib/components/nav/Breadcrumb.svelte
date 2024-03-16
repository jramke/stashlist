<script lang="ts">
    export let path: string[];

</script>

<p class="flex gap-2 items-center">
    {#each path as item, i}
        {#if i === path.length - 1}
            <span class="font-bold">
                {item}
            </span>
        {:else}
            <span class="text-muted-foreground">{item}</span>
            <span class="text-muted-foreground">/</span>
            <!-- <Separator orientation="vertical" class="w-[1px] mx-[1px] rotate-12 h-[120%] via-foreground/30" /> -->
        {/if}
    {/each}
</p>