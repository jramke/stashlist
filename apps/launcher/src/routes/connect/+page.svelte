<script lang="ts">
    import { Button } from "@repo/ui/components/button";
    import { getCommandMenuContext } from "$lib/command/context";
    import { apiKey } from "$lib/stores";
    import { onMount } from "svelte";
    import { ChevronLeft } from "@repo/ui/icons";
    import { Input } from "@repo/ui/components/input";
    import { insertRecord, stronghold } from "$lib/stronghold";
    import { get } from "svelte/store";
    import { goto } from "$app/navigation";
    import { toast } from "@repo/ui/components/sonner";

    let apiKeyFormError = '';

    const { apiInput } = getCommandMenuContext();

    onMount(async () => {
        console.log('connect page mount');
        apiInput.set(document.getElementById('api-key-input') as HTMLInputElement);
        $apiInput?.focus();
        if ($apiKey && $apiInput) {
            $apiInput.value = $apiKey;
        }
    });

    async function handleSubmit(e: Event) {
        const formData = new FormData(e.target as HTMLFormElement);
        const formDataApiKey = formData.get('api-key') as string;
        if (formDataApiKey) {
            insertRecord('api-key', formDataApiKey);
            await get(stronghold).save();
            apiKey.set(formDataApiKey);
            apiKeyFormError = '';
            toast.success('API key connected!');
            setTimeout(() => {
                goto('/');
            }, 150);
        } else {
            apiKeyFormError = 'Please enter a valid API key';
        }
    }

</script>

<div class="p-4">
    <div class="relative h-7 flex items-center justify-center">
        <Button size={'icon'} class="size-7 absolute top-0 left-0" aria-label="Back" on:click={() => goto('/')}>
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
        <Button type="submit" class="mt-4">Connect</Button>
    </form>
</div>