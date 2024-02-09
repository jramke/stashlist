<script lang="ts">
	import type { FormOptions } from "formsnap";
	import { formSchema, type FormSchema } from "./schema";
    import type { SuperValidated } from "sveltekit-superforms";
	import type { Save, TODO } from "$lib/types";

    import * as Form from "$lib/components/ui/form";
    import Tags from "$lib/components/ui/tags";
    import * as Select from "$lib/components/ui/select";

    export let data: {
        form: SuperValidated<FormSchema>,
        save: TODO,
        groups: TODO,
    };

    const aviableGroups = data.groups;
    console.log(data);
    
    let groups = data.save.saveGroups.map(item => item.group) || [];
    $: groupIds = groups.map(item => item.id);
    

    const options: FormOptions<FormSchema> = {
        onSubmit: () => {
            history.back();
        },
        onError: () => {
            history.back();
        }
    };

</script>

<Form.Root method="POST" form={data.form} {options} schema={formSchema} let:config class="space-y-2">
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