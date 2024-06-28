<script lang="ts">
    import { Button } from "@repo/ui/components/button";
    import { Unplug } from "@repo/ui/icons";
    import { onMount } from "svelte";
    import { getCommandMenuContext } from "../context";
    import { insertRecord, stronghold } from "$lib/stronghold";
    import { get } from "svelte/store";
    import { apiKey } from "$lib/stores";
    import { toast } from "@repo/ui/components/sonner";

    let apiKeyFormError = '';

    const connectText = 'Connect your Stashlist account.';
    const connectedText = 'API key is already connected. Connect a new account.';
    let infoText = $apiKey ? connectedText : connectText;

    const apiKeyPattern = /^([a-zA-Z0-9%]+)-[a-zA-Z0-9]{30}$/;

    const { searchValue, goPageBack, searchInput } = getCommandMenuContext();

    onMount(() => {       
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
            apiKeyFormError = '';
        };
    });

    async function handleSubmit() {        
        if (!$searchValue) {
            infoText = connectText;
            if ($apiKey) {
                infoText = connectedText;
            }
            return;
        }

        if ($searchValue === $apiKey) {
            infoText = connectedText;
            apiKeyFormError = '';
            return;
        }

        if (apiKeyPattern.test($searchValue)) {
            insertRecord('api-key', $searchValue);
            await get(stronghold).save();
            apiKey.set($searchValue);
            apiKeyFormError = '';
            toast.success('API key connected!');
            setTimeout(() => {
                goPageBack();
            }, 50);
        } else {
            apiKeyFormError = 'Please enter a valid API key';
            $searchInput?.focus();
        }
    }

</script>
<div class="flex gap-4 p-2 items-center justify-between">
    <div class="flex gap-3 items-center py-3">
        <Unplug class="size-5" />
        {#if apiKeyFormError}
            <p class="text-red-500">{apiKeyFormError}</p>
        {:else}
            <p class="text-muted-foreground">{infoText}</p>
        {/if}
    </div>
    <Button on:click={() => handleSubmit()}>Connect</Button>
</div>