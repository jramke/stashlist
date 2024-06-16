<script lang="ts">
    import { Button } from "@repo/ui/components/button";
    import { getCommandMenuContext } from "./context";
    import { onMount } from "svelte";
    import { ChevronLeft } from "@repo/ui/icons";
    import { Input } from "@repo/ui/components/input";
    import { getRecord, insertRecord, stronghold, strongholdClientStore } from "$lib/stronghold";
    import { get } from "svelte/store";

    let apiKeyFormError = '';
    let apiKeyFormSuccess = '';

    const { apiInput, goPageBack, updateFocusableEls } = getCommandMenuContext();

    onMount(async () => {
        console.log('connect page mount');
        updateFocusableEls();
        apiInput.set(document.getElementById('api-key-input') as HTMLInputElement);
        $apiInput?.focus();
        const apikey = await getRecord('api-key');
        console.log('apikey from stronghold', apikey);
        if (apikey && $apiInput) {
            $apiInput.value = apikey;
        }
    });

    async function handleSubmit(e: Event) {
        const formData = new FormData(e.target as HTMLFormElement);
        const apiKey = formData.get('api-key') as string;
        if (apiKey) {
            insertRecord('api-key', apiKey);
            await get(stronghold).save();
            apiKeyFormError = '';
            apiKeyFormSuccess = 'API key connected!';
        } else {
            apiKeyFormSuccess = '';
            apiKeyFormError = 'Please enter a valid API key';
        }
    }

</script>

<div class="p-4">
    <div class="relative h-7 flex items-center justify-center">
        <Button size={'icon'} class="size-7 absolute top-0 left-0" aria-label="Back" on:click={() => goPageBack()}>
            <ChevronLeft class="size-4" />
        </Button>
        <h2 class="text-xl leading-none font-bold">Connect</h2>
    </div>
    <form class="pt-6" method="POST" on:submit|preventDefault={handleSubmit}>
        <label class="text-sm" for="api-key-input">Enter your API key</label>
        <Input id="api-key-input" name="api-key" class="mt-1" autocorrect="off" autocomplete="off" spellcheck="false" />
        {#if apiKeyFormError}
            <p class="text-red-500 text-sm mt-2">{apiKeyFormError}</p>
        {/if}
        {#if apiKeyFormSuccess}
            <p class="text-green-500 text-sm mt-2">{apiKeyFormSuccess}</p>
        {/if}
        
        <Button type="submit" class="mt-4">Connect</Button>
    </form>
</div>