<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import UserLoginForm from './user-login-form.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div
	class="container relative grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0"
>
	<Button href="/register" variant="ghost" class="absolute right-4 top-4 md:right-8 md:top-8">
		Register
	</Button>
	<div class="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
		<div
			class="absolute inset-0 bg-cover"
			style="
				background-image:
					url(https://images.unsplash.com/photo-1590069261209-f8e9b8642343?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1376&q=80);"
		/>
		<div class="relative z-20 flex items-center text-lg font-medium">Stashlist</div>
		<div class="relative z-20 mt-auto">
			<p class="text-lg">The bookmark tool for developers and designers.</p>
		</div>
	</div>
	<div class="lg:p-8">
		<div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
			<div class="flex flex-col space-y-2 text-center">
				<h1 class="text-2xl font-semibold tracking-tight">Log in with your account</h1>
				<p class="text-sm text-muted-foreground">Use your email or log in with GitHub</p>
			</div>
			<UserLoginForm form={data.form} />
			<p class="px-8 text-center text-sm text-muted-foreground">
				By clicking continue, you agree to our{' '}
				<a href="/terms" class="underline underline-offset-4 hover:text-primary">
					Terms of Service
				</a>{' '}
				and{' '}
				<a href="/privacy" class="underline underline-offset-4 hover:text-primary">
					Privacy Policy
				</a>
				.
			</p>
		</div>
	</div>
</div>
