<script lang="ts">
	import type { Save, TODO } from "$lib/types";

    import { formatRelativeTime } from '$lib/utils';
    import { Badge } from "@repo/ui/components/badge";
	import { cn } from "@repo/ui/utils";

    export let saveGroups: TODO;
    export let createdAt: Save['createdAt'];

    let creationDate: Date;
	if (createdAt) {
		creationDate = new Date(createdAt);
	}

</script>

<div class={cn(
    `bg-card overflow-hidden min-h-10 flex w-full gap-4 p-4 pt-0 justify-between items-end self-end 
    absolute bottom-0 opacity-0 translate-y-10 origin-bottom transition-all duration-75 
    group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0`
)}>
    <div>
        {#if saveGroups.length !== 0}
            <div class="flex flex-wrap gap-1">
                {#each saveGroups as group}
                    <Badge variant="outline">
                        {group.group.title}
                    </Badge>
                {/each}
            </div>
        {/if}
    </div>
    <div class="text-xs leading-none text-muted-foreground tracking-none">
        {formatRelativeTime(creationDate)}
    </div>
</div>