<script lang="ts">
	import type { Save, TODO } from "$lib/types";

    import { formatRelativeTime } from '$lib/utils';
    import { Badge } from "@repo/ui/components/badge";

    export let saveGroups: TODO;
    export let createdAt: Save['createdAt'];

    let creationDate: Date;
	if (createdAt) {
		creationDate = new Date(createdAt);
	}

</script>

<div class="min-h-10 w-full flex gap-4 p-4 pt-0 justify-between items-end self-end">
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