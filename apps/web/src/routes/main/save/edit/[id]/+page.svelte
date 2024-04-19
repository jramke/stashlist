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

    export let data: {
        form: SuperValidated<Infer<FormSchema>>,
        save: TODO,
        groups: TODO,
        isDialog: boolean,
    };
    // export let data: PageData;

    const form = superForm(data?.form, {
        validators: zodClient(formSchema),
    });

    const { form: formData, enhance } = form;

    const aviableGroups = data?.groups;
    
    // //TODO: types
    let groups = data?.save.saveGroups.map(item => item.group) || [];
    $: groupIds = groups.map(item => item.id);
    
    async function onLegacyCancel() {
        await invalidateAll();
        history.back();
    }

</script>

<form method="POST" id="edit-stash-form" class="space-y-4" use:enhance>
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
    <slot />
    {#if data?.isDialog === false} 
        <div class="space-x-2">
            <Button on:click={onLegacyCancel} variant="outline">Cancel</Button>
            <Button type="submit">Update</Button>
        </div>
    {/if}
</form>