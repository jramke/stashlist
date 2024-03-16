<script lang="ts">
	import { Button } from '@repo/ui/components/button';
	import { Google, GitHub, Loader } from '@repo/ui/icons';

	let isLoading = false;

	
</script>

<div class="flex flex-col gap-4">
	<Button variant="outline" type="button" href="/login/github" disabled={isLoading}>
		{#if isLoading}
			<Loader class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<GitHub class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		GitHub
	</Button>
	<!-- <span class="text-muted-foreground text-xs uppercase"> or </span> -->
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
