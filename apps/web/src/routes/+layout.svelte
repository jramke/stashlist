<script>
	import '@repo/ui/globals.pcss';
	import '../app.pcss';

	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@repo/ui/components/sonner';
	import {Navigation, Footer, Metadata } from '$lib/components/site';
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';
</script>

<Metadata />
<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-center" />

{#if !$page.route?.id?.includes(siteConfig.appUrl)}
	<Navigation />
{/if}

<main id="stashlist-app">
	<slot />
</main>

{#if !$page.route?.id?.includes(siteConfig.appUrl)}
	<Footer />
{/if}
