<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@repo/ui/components/button';
	import { Google, GitHub, Loader } from '@repo/ui/icons';
	import { onMount } from 'svelte';

	let loading = {
		github: false,
		google: false
	}

	$: isSomethingLoading = Object.values(loading).some((value) => value === true);
	
	onMount(() => {
		loading = {
			github: false,
			google: false
		}
	});
	
</script>

<div class="flex flex-col gap-4">
	<Button variant="outline" type="button" disabled={isSomethingLoading} on:click={() => {
		loading.github = true
		goto('/login/github');
	}}>
		{#if loading.github}
			<Loader class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<GitHub class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		GitHub
	</Button>
	<!-- <span class="text-muted-foreground text-xs uppercase"> or </span> -->
	<Button variant="outline" type="button" disabled={isSomethingLoading} on:click={() => {
		loading.github = true
		goto('/login/google');
	}}>
		{#if loading.google}
			<Loader class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<Google class="mr-2 h-4 w-4" />
		{/if}
		{' '}
		Google
	</Button>
	
</div>
