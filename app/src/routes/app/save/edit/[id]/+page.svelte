<script lang="ts">
	import type { PageData } from "./$types";
	import type { FormOptions } from "formsnap";
	import { formSchema, type FormSchema } from "./schema";
    import type { SuperValidated } from "sveltekit-superforms";
	import type { Save, TODO } from "$lib/types";

    import * as Form from "$lib/components/ui/form";
	import Input from "$lib/components/ui/input/input.svelte";

    export let data: {
        form: SuperValidated<FormSchema>,
        save: Save
    };

    const options: FormOptions<FormSchema> = {
        onSubmit: () => {
            history.back();
        },
        onError: () => {
            history.back();
        }
    };
    // console.log(data.save);
    // $: title = data.save.title;
    $: console.log('save on form page', data.save, data.form);

    let test = 'abc';
    test = data.save.title;
    
</script>

<Form.Root method="POST" form={data.form} {options} schema={formSchema} let:config>
    <!-- <Input type="hidden" bind:value={data.save.id} /> -->
    <input type="hidden" name="id" value={data.save.id}>
    <!-- <Form.Field {config} name="id">
        <Form.Item>
            <Form.Input type="hidden" bind:value={data.save.id} />
        </Form.Item>
    </Form.Field> -->
    <Form.Field {config} name="title">
        <Form.Item>
            <Form.Label>Title</Form.Label>
            <Form.Input value={test} />
            <Form.Validation />
        </Form.Item>
    </Form.Field>
    <Form.Field {config} name="description">
        <Form.Item>
            <Form.Label>Description</Form.Label>
            <Form.Textarea value={data.save.description} />
            <Form.Validation />
        </Form.Item>
    </Form.Field>
    <Form.Field {config} name="imageUrl">
        <Form.Item>
            <Form.Label>Image url</Form.Label>
            <Form.Input value={data.save.imageUrl} />
            <Form.Validation />
        </Form.Item>
    </Form.Field>
    <Form.Button>Update stash</Form.Button>
</Form.Root>