<script lang="ts">
	import UserLoginForm from './user-login-form.svelte';
	import Section from '@repo/ui/components/section';
	import { page } from '$app/stores';
	import { toast } from '@repo/ui/components/sonner';
	import { onMount } from 'svelte';

	onMount(() => {
		if ($page.url.searchParams.has('error')) {
			toast.error('Login failded. Please try again.');
		}
	})
</script>

<Section class="py-20">
	<div class="container max-w-[400px] mx-auto flex flex-col gap-6">
		<div class="flex flex-col space-y-2">
			<h1 class="text-2xl font-semibold tracking-tight">Login</h1>
			<p class="text-sm text-muted-foreground">Your digital vault awaits – let's get started!</p>
		</div>
		<UserLoginForm />
		<p class="text-sm text-muted-foreground">
			By logging in, you agree to our{' '}
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
</Section>
