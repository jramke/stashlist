<script>
	import '@fontsource-variable/plus-jakarta-sans';
	import '../app.pcss';
	import '$lib/styles/app.css';

	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@ui/components/ui/sonner';
	import Navigation from '$lib/components/nav/Navigation.svelte';
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';
</script>

<ModeWatcher />
<Toaster position="bottom-center" />

{#if !$page.route?.id?.includes('(auth)') && !$page.route?.id?.includes(siteConfig.appUrl)}
	<Navigation />
{/if}

<svelte:head>
	<title>Stashlist</title>
</svelte:head>

<main>
	<slot />
</main>
