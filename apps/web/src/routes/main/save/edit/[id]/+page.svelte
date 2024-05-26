<script lang="ts">
	import { formSchema, type FormSchema } from "./schema";
    import { type SuperValidated, type Infer, superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
	import type { Save, TODO } from "$lib/types";
	import type { PageData } from "./$types";

    import * as Form from "@repo/ui/components/form";
    import { Input } from "@repo/ui/components/input";
    import { Textarea } from "@repo/ui/components/textarea";
    import Tags from "@repo/ui/components/tags";
	import { Button } from "@repo/ui/components/button";
	import { invalidateAll } from "$app/navigation";
	import { ItemImage } from "$lib/components/app/saves/item";
	import { formatRelativeTime } from "$lib/utils";
	import { Copy } from "@repo/ui/icons";
	import { itemsStore } from "$lib/stores";
	import ItemMedia from "$lib/components/app/saves/item/item-media.svelte";

    export let data: {
        form: SuperValidated<Infer<FormSchema>>,
        save: TODO,
        groups: TODO,
        isDialog: boolean,
    };
    // export let data: PageData;

    const { copyUrlToClipboard, editDialogOpen } = itemsStore;

    const form = superForm(data?.form, {
        validators: zodClient(formSchema),
    });

    const { form: formData, enhance } = form;

    const aviableGroups = data?.groups;

    const creationDate = new Date(data?.save.createdAt);
    const readableDate = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(creationDate)
    
    // // //TODO: types
    let groups = data?.save.saveGroups.map(item => item.group) || [];
    let groupIds = groups.map(item => item.id);

    async function onLegacyCancel() {
        await invalidateAll();
        history.back();
    }

    function handleUrlCopy(url: string) {
        copyUrlToClipboard(url);
        editDialogOpen.set(false);
    }

</script>
<form method="POST" id="edit-stash-form" class="flex-grow flex flex-col gap-4 justify-between" use:enhance>
    <div class="flex flex-col gap-4">
        <Form.Field {form} name="title">
            <Form.Control let:attrs>
                <Form.Label>Title</Form.Label>
                <Input {...attrs} bind:value={$formData.title} />
            </Form.Control>
            <Form.FieldErrors />
        </Form.Field>
        <Form.Field {form} name="description">
            <Form.Control let:attrs>
                <Form.Label>Description</Form.Label>
                <Textarea {...attrs} bind:value={$formData.description} />
            </Form.Control>
            <Form.FieldErrors />
        </Form.Field>
        <Form.Field {form} name="groups">
            <Form.Control let:attrs>
                <Form.Label>Groups</Form.Label>
                <input type="hidden" name="groups" bind:value={groupIds} />
                <Tags
                    bind:tags={groups}
                    placeholder={"Add groups"}
                    autoComplete={aviableGroups}
                    minChars={0}
                    onlyUnique={true}
                    cleanOnBlur={true}
                    autoCompleteKey={'title'}
                    name={'Add groups'}
                    onlyAutocomplete
                />
            </Form.Control>
            <Form.FieldErrors />
        </Form.Field>
        <input type="hidden" name="id" bind:value={$formData.id}>
        <div class="space-y-2">
            <span class="text-sm font-medium leading-none">Image</span>
            <ItemMedia class="m-0" type={data?.save.type} title={data?.save.title} imageUrl={data?.save.imageUrl} url={data?.save.url} gradientIndex={data?.save.gradientIndex} />
        </div>
        {#if data?.save.url}
            <div class="space-y-2">
                <span class="text-sm font-medium leading-none">URL</span>
                <div class="flex items-center gap-2 max-w-full">
                    <a href={data?.save.url} target="_blank" rel="noreferrer noopener" class="truncate max-w-[calc(100%-(1rem+0.5rem))] leading-tight text-sm text-muted-foreground underline underline-offset-4">{data?.save.url}</a>
                    <button type="button" class="focusable" on:click={() => handleUrlCopy(data?.save.url)}>
                        <Copy class="size-4 -mb-1" />
                    </button>
                </div>
            </div>
        {/if}
        <div class="space-y-2">
            <span class="text-sm font-medium leading-none">Created</span>
            <span class="leading-tight block text-sm text-muted-foreground">{formatRelativeTime(creationDate)} – {readableDate}</span>
        </div>
    </div>
    <div>
        <slot />
        {#if data?.isDialog === false} 
            <div class="space-x-2">
                <Button on:click={onLegacyCancel} variant="outline">Cancel</Button>
                <Button type="submit">Update</Button>
            </div>
        {/if}
    </div>
</form>