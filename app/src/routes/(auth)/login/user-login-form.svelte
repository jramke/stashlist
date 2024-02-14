<script lang="ts">
	import { Github, Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	let isLoading = false;

	
</script>

<div class="grid gap-6">
	<Button variant="outline" type="button" href="/login/oauth/github" disabled={isLoading}>
		{#if isLoading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<Github class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		GitHub
	</Button>
	<div class="relative">
		<div class="absolute inset-0 flex items-center">
			<span class="w-full border-t" />
		</div>
		<div class="relative flex justify-center text-xs uppercase">
			<span class="bg-background px-2 text-muted-foreground"> Or continue with </span>
		</div>
	</div>
	<Button variant="outline" type="button" href="/login/oauth/github" disabled={isLoading}>
		{#if isLoading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<Github class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		Google
	</Button>
	
</div>
