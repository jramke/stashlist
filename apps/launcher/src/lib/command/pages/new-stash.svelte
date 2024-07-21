<script lang="ts">
    import { Button } from "@repo/ui/components/button";
    import { Plus } from "@repo/ui/icons";
    import { onMount } from "svelte";
    import { getCommandMenuContext } from "../context";
    import { newStashInputValue } from "$lib/stores";

    let newStashFormError = '';
    let infoText = 'Enter a website, image link, text or a color.';

    const { searchValue, goPageBack, changePage, availablePages } = getCommandMenuContext();

    onMount(() => {       
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };

        setTimeout(() => {
            window.addEventListener('keydown', handleKeydown);
        }, 100);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
            newStashFormError = '';
        };
    });

    async function handleSubmit() {
        if (!$searchValue) {
            newStashFormError = 'Please enter a valid value';
            return;
        }
        newStashInputValue.set($searchValue);
        try {
            changePage(availablePages.newStashGroups);
        } catch (error) {
            newStashInputValue.set('');
            newStashFormError = 'Something went wrong';
        }
    }

</script>
<div class="flex gap-4 p-2 items-center justify-between">
    <div class="flex gap-3 items-center py-3">
        <Plus class="size-5" />
        {#if newStashFormError}
            <p class="text-red-500">{newStashFormError}</p>
        {:else}
            <p class="text-muted-foreground">{infoText}</p>
        {/if}
    </div>
    <Button on:click={handleSubmit}>Create</Button>
</div>

<!-- <div class="flex flex-col p-2 h-full justify-between">
    <div class="grid grid-cols-4 items-center">
        <span class="col-span-1 text-sm text-muted-foreground">Groups</span>
        <div class="col-span-3">
            <Tags
                bind:tags={selectedGroups}
                placeholder={"Add groups"}
                autoComplete={aviableGroups}
                minChars={0}
                onlyUnique={true}
                cleanOnBlur={true}
                autoCompleteKey={'title'}
                name={'Add groups'}
                onlyAutocomplete
            />
        </div>
    </div>
    <div class="flex gap-4 items-center justify-between">
        <div class="flex gap-3 items-center py-3">
            <Plus class="size-5" />
            {#if newStashFormError}
                <p class="text-red-500">{newStashFormError}</p>
            {:else}
                <p class="text-muted-foreground">{infoText}</p>
            {/if}
        </div>
    </div>
    <div class="flex justify-end flex-grow mt-auto">
        <Button on:click={() => handleSubmit()} disabled={busy}>
            {#if busy}
                <Loader class="me-2 animate-spin size-4" />
            {/if}
            Create
        </Button>
    </div>
</div> -->