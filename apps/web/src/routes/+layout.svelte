<script>
	import '@repo/ui/globals.pcss';
	import '../app.pcss';

	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@repo/ui/components/sonner';
	import Navigation from '$lib/components/nav/Navigation.svelte';
	import Footer from '$lib/components/site/Footer.svelte';
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';
	import Metadata from '$lib/components/site/Metadata.svelte';

</script>

<svelte:head>
	<title>Stashlist</title>
</svelte:head>

<Metadata />
<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-center" />

{#if !$page.route?.id?.includes(siteConfig.appUrl)}
	<Navigation />
{/if}

<main>
	<slot />
</main>

{#if !$page.route?.id?.includes(siteConfig.appUrl)}
	<Footer />
{/if}
