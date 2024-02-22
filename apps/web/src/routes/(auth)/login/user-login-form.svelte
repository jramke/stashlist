<script lang="ts">
	import { Button } from '@repo/ui/components/button';
	import { Google, GitHub, Loader } from '@repo/ui/icons';

	let isLoading = false;

	
</script>

<div class="grid gap-6">
	<Button variant="outline" type="button" href="/login/github" disabled={isLoading}>
		{#if isLoading}
			<Loader class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<GitHub class="mr-2 h-4 w-4" />
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
	<Button variant="outline" type="button" href="/login/google" disabled={isLoading}>
		{#if isLoading}
			<Loader class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<Google class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		Google
	</Button>
	
</div>
