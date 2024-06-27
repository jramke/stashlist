<script lang="ts">
    import * as Dialog from '@repo/ui/components/dialog';
    import { Button } from "@repo/ui/components/button";
    import { generateKeyDialogOpen } from '$lib/stores';
	import { Input } from '@repo/ui/components/input';
	import { CopyButton } from '..';
	import { Eye, EyeOff } from '@repo/ui/icons';

    let apiKey: string;
    let showApiKey = false;
    let modifiedApiKey: string;

    $: if (apiKey) {
        const splittedApiKey = apiKey.split('-');
        let blurs = '';
        splittedApiKey[1].split('').forEach(() => {
            blurs += '∗'; // middle asterisk
        });
        modifiedApiKey = `${splittedApiKey[0]}-${blurs}`;
    }

    async function generateApiKey() {
        const response = await fetch("/api/connect/generate-key", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            apiKey = data.apiKey;
        } else {
            console.error("Failed to generate API key");
        }
    }

</script>


<Dialog.Root bind:open={$generateKeyDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Generate new API key</Dialog.Title>
            <Dialog.Description>
                The key is only shown once and will be deleted if you generate a new one.
            </Dialog.Description>
        </Dialog.Header>
        <div class="text-sm space-y-2">
            <p>Desktop app coming soon...</p>
            <!-- <p class="font-bold">How it works</p>
            <p>The API key is used to connect your account to the desktop app.</p>
            <p>1. <span>Generate a new API key.</span></p>
            <p>3. <span>Paste the key into the desktop app.</span></p>
            <p>2. <span>Copy the key and go to the desktop app.</span></p> -->
        </div>
        {#if apiKey}
            <div class="relative">
                <Input value={showApiKey ? apiKey : modifiedApiKey} class="pr-16" />
                <button class="focusable absolute right-10 top-3 bottom-3" on:click={() => showApiKey = !showApiKey}>
                    {#if showApiKey}
                        <Eye class="w-full h-full" />
                    {:else}
                        <EyeOff class="w-full h-full" />
                    {/if}
                </button>
                <CopyButton copyString={apiKey} copyButtonClass="absolute right-3 top-3 bottom-3" />
            </div>
        {:else}
            <Dialog.Footer>
                <Button on:click={generateApiKey}>
                    Generate API Key
                </Button>
            </Dialog.Footer>
        {/if}

    </Dialog.Content>
</Dialog.Root>
