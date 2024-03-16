<script lang="ts">
	import { formSchema, type FormSchema } from "./schema";
    import type { SuperValidated } from "sveltekit-superforms";
	import type { Save, TODO } from "$lib/types";

    import * as Form from "@repo/ui/components/form";
    import Tags from "@repo/ui/components/tags";

    export let data: {
        form: SuperValidated<FormSchema>,
        save: TODO,
        groups: TODO,
    };

    const aviableGroups = data.groups;
    
    //TODO: types
    let groups = data.save.saveGroups.map(item => item.group) || [];
    $: groupIds = groups.map(item => item.id);
    

</script>

<Form.Root method="POST" form={data.form} schema={formSchema} let:config class="space-y-2">
    <input type="hidden" name="id" value={data.save.id}>
    <Form.Field {config} name="title">
        <Form.Item>
            <Form.Label>Title</Form.Label>
            <Form.Input />
            <Form.Validation />
        </Form.Item>
    </Form.Field>
    <Form.Field {config} name="description">
        <Form.Item>
            <Form.Label>Description</Form.Label>
            <Form.Textarea />
            <Form.Validation />
        </Form.Item>
    </Form.Field>
    <Form.Field {config} name="groups">
        <Form.Item>
            <Form.Label>Groups</Form.Label>
            <Form.Input type="hidden" bind:value={groupIds} />
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
            <Form.Validation />
        </Form.Item>
    </Form.Field>
    <!-- <Form.Button>
    </Form.Button> -->
    <slot />
</Form.Root>