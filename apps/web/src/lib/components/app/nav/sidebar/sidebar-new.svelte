<script lang="ts">
    import type { SubmitFunction } from '@sveltejs/kit';
    
    import { invalidateAll } from '$app/navigation';
    import { enhance, applyAction } from '$app/forms';
    import { siteConfig } from '$lib/config/site';
    import * as Dialog from '@repo/ui/components/dialog';
    import { buttonVariants, Button } from '@repo/ui/components/button';
    import { Input } from '@repo/ui/components/input';
	import { toast } from '@repo/ui/components/sonner';
	import { Label } from '@repo/ui/components/label';
    import { Plus, Loader } from '@repo/ui/icons';

    export let busy: boolean;

    $: newStashFormError = '';
	let newStashFormDialogOpen = false;

    const enhanceNewStashForm: SubmitFunction = () => {
		busy = true;
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				newStashFormError = '';
				newStashFormDialogOpen = false;
				toast.success('Successfully stashed new website');
			} else {
				newStashFormError = 'Something went wrong stashing the website';
			}
			busy = false;
		};
	};

</script>

<Dialog.Root bind:open={newStashFormDialogOpen}>
    <Dialog.Trigger class={buttonVariants({ variant: 'ghost' })}>
        <span class="sr-only">New stash</span>
        <Plus class="h-4 w-4" />
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Stash a new website</Dialog.Title>
        </Dialog.Header>
        <form
            method="POST"
            action={siteConfig.appUrl + '/save/new'}
            class="space-y-2"
            use:enhance={enhanceNewStashForm}
        >	
            <Label for="url">Url</Label>
            <Input type="text" name="url" />
            {#if newStashFormError}
                <p class="text-sm text-destructive" aria-live="assertive">{newStashFormError}</p>
            {/if}
            <Dialog.Footer>
                <Button type="submit" disabled={busy} class="mt-3">
                    {#if busy}<Loader class="h-4 w-4 animate-spin me-2" />{/if}
                    Add
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>