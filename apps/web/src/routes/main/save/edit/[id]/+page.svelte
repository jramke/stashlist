<script lang="ts">
	import { formSchema, type FormSchema } from "./schema";
    import { type SuperValidated, type Infer, superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
	import type { Save, TODO } from "$lib/types";

    import * as Form from "@repo/ui/components/form";
    import { Input } from "@repo/ui/components/input";
    import { Textarea } from "@repo/ui/components/textarea";
    import Tags from "@repo/ui/components/tags";
	import { Button } from "@repo/ui/components/button";
	import { invalidateAll } from "$app/navigation";
	import { formatRelativeTime } from "$lib/utils";
	import ItemMedia from "$lib/components/app/saves/item/item-media.svelte";
	import { CopyButton } from "$lib/components/app";
	import { onMount } from "svelte";
	import { Loader } from "@repo/ui/icons";
	import ItemImage from "$lib/components/app/saves/item/item-image.svelte";

    export let data: {
        form: SuperValidated<Infer<FormSchema>>,
        save: TODO,
        groups: TODO,
        isDialog: boolean,
    };

    export let busy = false;

    const form = superForm(data?.form, {
        validators: zodClient(formSchema),
        delayMs: 350,
    });

    const { form: formData, enhance, delayed } = form;

    const aviableGroups = data?.groups;

    const creationDate = new Date(data?.save.createdAt);
    const readableDate = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(creationDate);

    let formRef: HTMLFormElement;

    $: if ($delayed === true) {
        busy = true;
    } else {
        busy = false;
    }
    
    // // //TODO: types
    let groups = data?.save.saveGroups.map(item => item.group) || [];
    $: groupIds = groups.map(item => item.id);

    onMount(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "s") {
                event.preventDefault();
                formRef?.requestSubmit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    })

    async function onLegacyCancel() {
        await invalidateAll();
        history.back();
    }

</script>
<form method="POST" id="edit-stash-form" class="flex-grow flex flex-col gap-4 justify-between" bind:this={formRef} use:enhance>
    <div class="flex flex-col gap-4">
        <Form.Field {form} name="title">
            <Form.Control let:attrs>
                <Form.Label>Title</Form.Label>
                <Input {...attrs} bind:value={$formData.title} />
            </Form.Control>
            <Form.FieldErrors />
        </Form.Field>
        {#if data?.save.type === 'text'}
            <Form.Field {form} name="text">
                <Form.Control let:attrs>
                    <Form.Label>Text</Form.Label>
                    <Textarea spellcheck="false" {...attrs} bind:value={$formData.text} />
                </Form.Control>
                <Form.FieldErrors />
            </Form.Field>
        {:else}
            <Form.Field {form} name="description">
                <Form.Control let:attrs>
                    <Form.Label>Description</Form.Label>
                    <Textarea {...attrs} bind:value={$formData.description} />
                </Form.Control>
                <Form.FieldErrors />
            </Form.Field>
        {/if}
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
        {#if data?.save.type === 'image' || data?.save.type === 'website'}
            <div class="space-y-2">
                <span class="text-sm font-medium leading-none">{data?.save.type === 'website' ? 'OG ' : ''}Image</span>
                <div class="rounded-sm overflow-hidden">
                    <ItemImage title={data?.save.title} imageUrl={data?.save.imageUrl} gradientIndex={data?.save.gradientIndex} />
                </div>
            </div>
        {/if}
        {#if data?.save.type === 'color'}
            <div class="space-y-2">
                <span class="text-sm font-medium leading-none">Color</span>
                <div class="rounded-sm overflow-hidden">
                    <div class="relative flex aspect-og overflow-hidden" style={`background-color: ${data?.save.title}`}></div>
                </div>
            </div>
        {/if}
        {#if data?.save.url}
            <div class="space-y-2">
                <span class="text-sm font-medium leading-none">URL</span>
                <div class="flex items-center gap-2 max-w-full">
                    <a href={data?.save.url} target="_blank" rel="noreferrer noopener" class="truncate max-w-[calc(100%-(1rem+0.5rem))] leading-tight text-sm text-muted-foreground underline underline-offset-4">{data?.save.url}</a>
                    <CopyButton copyString={data?.save.url} copyText={'Copy URL to clipboard'} />
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
                <Button on:click={onLegacyCancel} variant="outline" disabled={busy}>Cancel</Button>
                <Button type="submit" disabled={busy}>
                    {#if busy}
                        <Loader class="animate-spin size-4" />
                        <span class="ml-2">Updating...</span>
                    {:else}
                        Update
                    {/if}
                </Button>
            </div>
        {/if}
    </div>
</form>