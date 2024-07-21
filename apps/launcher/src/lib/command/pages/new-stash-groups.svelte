<script lang="ts">
    import { onMount } from "svelte";
    import { getCommandMenuContext } from "../context";
    import { getRecord } from "$lib/stronghold";
    import { toast } from "@repo/ui/components/sonner";
    import { getItems } from "$lib/queries";
    import { fetch } from "@tauri-apps/plugin-http";
    import { siteConfig } from "@repo/constants";
    import { groups, newStashInputValue } from "$lib/stores";
    import * as Command from "@repo/ui/components/command";
    import { Gradient } from "@repo/ui/components/gradient";
    import { Badge } from "@repo/ui/components/badge";
    import { derived, writable } from "svelte/store";
    import { newStashSelectedGroups } from "$lib/stores";

    let newStashFormError = '';
    let busy = false;

    
    // $: groupIds = selectedGroups.map((item: { id: any; }) => item.id) || [];
    let groupIds = derived(newStashSelectedGroups, $selectedGroups =>
        $selectedGroups.map(item => item.id)
    );

    const { goPageBack, cmdPressed, searchValue, resetPages } = getCommandMenuContext();

    onMount(() => {       
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !$cmdPressed) {
                handleSubmit();
            }
        };

        setTimeout(() => {
            document.addEventListener('keydown', handleKeydown);
        }, 100);

        return () => {
            document.removeEventListener('keydown', handleKeydown);
            newStashFormError = '';
            newStashSelectedGroups.set([]);
        };
    });

    async function handleSubmit() {
        if (busy) return;

        if (!$newStashInputValue) {
            goPageBack();
            newStashSelectedGroups.set([]);
            return;
        }
        console.log('submitting');
        
        busy = true;
        
        const res = await fetch(siteConfig.wwwUrl + '/api/saves/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': await getRecord('api-key'),
            },
            body: JSON.stringify({
                input: $newStashInputValue,
                groups: $groupIds?.join(',') || '',
            }),
        });

        if (res.status !== 200) {
            newStashFormError = 'Error creating stash';
        } else {
            toast.success('New stash created');
            getItems();
            resetPages();
        }
        searchValue.set('');
        newStashInputValue.set('');
        newStashSelectedGroups.set([]);
        busy = false;
    }

    const handleGroupSelect = (group: any) => {
        console.log('group selected', $cmdPressed);
        
        if (!$cmdPressed) {
            // handleSubmit();
            return;
        };
        
        // if (groupIds.includes(group.id)) {
        //     selectedGroups = selectedGroups.filter((item: { id: any; }) => item.id !== group.id)
        // } else {
        //     selectedGroups = [...selectedGroups, group];
        // }
        newStashSelectedGroups.update(groups => {
            if (groups.some(item => item.id === group.id)) {
                return groups.filter(item => item.id !== group.id);
            } else {
                return [...groups, group];
            }
        });
    }

    $: console.log($newStashSelectedGroups);
    $: console.log($cmdPressed);

</script>

<Command.Group heading="Groups">
    {#each $groups as group}
        <Command.Item value={'group-' + group.id} onSelect={() => handleGroupSelect(group)}>
            <div class="rounded-full bg-secondary size-4 overflow-hidden relative me-2">
                <Gradient gradientIndex={group.gradientIndex} />
            </div>
            <span class="truncate max-w-[80%]">
                {group.title}
            </span>
            {#if $groupIds.includes(group.id)}
                <Badge class="ml-auto">
                    Selected
                </Badge>
            {/if}
        </Command.Item>
    {/each}
</Command.Group>