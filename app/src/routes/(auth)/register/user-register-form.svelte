<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { formSchema, type FormSchema } from './schema';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { Github, Loader2 } from 'lucide-svelte';
	import type { FormOptions } from 'formsnap';
	// import { user } from '$lib/db/user';

	export let form: SuperValidated<FormSchema>;

	let isLoading = false;

	const options: FormOptions<FormSchema> = {
		// onSubmit: async ({ formData, cancel }) => {
		// 	console.log(typeof window !== 'undefined');
		// 	isLoading = true;
		// 	const data = Object.fromEntries(formData);
		// 	const result = formSchema.safeParse(data);
		// 	if (!result.success) {
		// 		cancel();
		// 		return;
		// 	}
		// 	await user.register(result.data['email'], result.data['password'], result.data['name']);
		// 	isLoading = false;
		// }
	};
</script>

<div class="grid gap-6">
	<Form.Root method="POST" {form} {options} schema={formSchema} let:config>
		<div class="grid gap-2">
			<Form.Field {config} name="name">
				<Form.Item>
					<Form.Label>Name</Form.Label>
					<Form.Input />
					<Form.Validation />
				</Form.Item>
			</Form.Field>
			<Form.Field {config} name="email">
				<Form.Item>
					<Form.Label>E-mail</Form.Label>
					<Form.Input type="email" />
					<Form.Validation />
				</Form.Item>
			</Form.Field>
			<Form.Field {config} name="password">
				<Form.Item>
					<Form.Label>Password</Form.Label>
					<Form.Input type="password" />
					<Form.Validation />
				</Form.Item>
			</Form.Field>
			<Form.Button disabled={isLoading}>
				{#if isLoading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create account
			</Form.Button>
		</div>
	</Form.Root>
	<!-- <div class="relative">
		<div class="absolute inset-0 flex items-center">
			<span class="w-full border-t" />
		</div>
		<div class="relative flex justify-center text-xs uppercase">
			<span class="bg-background px-2 text-muted-foreground"> Or continue with </span>
		</div>
	</div>
	<Button variant="outline" type="button" disabled={isLoading}>
		{#if isLoading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<Github class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		GitHub
	</Button> -->
</div>
