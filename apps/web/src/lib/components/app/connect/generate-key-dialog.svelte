<script lang="ts">
    import * as Dialog from '@repo/ui/components/dialog';
    import { Button } from "@repo/ui/components/button";
    import { generateKeyDialogOpen } from '$lib/stores';
	import { Input } from '@repo/ui/components/input';
	import { CopyButton } from '..';
	import { Eye, EyeOff, Info } from '@repo/ui/icons';
	import { siteConfig } from '@repo/constants';

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
                The API key is used to connect your account to the desktop app.
            </Dialog.Description>
        </Dialog.Header>
        <div class="text-sm space-y-2 mb-3">
            <p>1. Install the desktop launcher <a href={siteConfig.releaseUrl} class="underline underline-offset-2">here</a></p>
            <p>2. Generate a new API key.</p>
            <p>3. Paste the key into the desktop app.</p>
            <p>4. Copy the key and go to the desktop app.</p>
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
                <div class="flex gap-2 text-xs text-muted-foreground">
                    <Info class="size-4 flex-shrink-0" />
                    <span>The key is only shown once and will be deleted if you generate a new one.</span>
                </div>
                <Button on:click={generateApiKey}>
                    Generate API Key
                </Button>
            </Dialog.Footer>
        {/if}

    </Dialog.Content>
</Dialog.Root>
