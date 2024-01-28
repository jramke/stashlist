<script>
	import '@fontsource-variable/plus-jakarta-sans';
	import '../app.pcss';
	import '$lib/styles/app.css';

	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import Navigation from '$lib/components/nav/Navigation.svelte';
	import { page } from '$app/stores';
	
</script>

<ModeWatcher />
<Toaster position="bottom-center" />

{#if !$page.route?.id?.includes('(auth)')}
	<Navigation />
{/if}

<main>
	<slot />
</main>
