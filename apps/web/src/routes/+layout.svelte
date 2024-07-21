<script>
	import '@repo/ui/globals.pcss';
	import '../app.pcss';

	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@repo/ui/components/sonner';
	import {Navigation, Footer, Metadata } from '$lib/components/site';
	import { page } from '$app/stores';
	import { siteConfig } from '@repo/constants';
	import { UmamiAnalytics } from '@lukulent/svelte-umami';

</script>

<UmamiAnalytics
	websiteID="0a85e0e8-2328-453f-a062-00a7d5fa71dd"
	srcURL="https://umami.joostramke.com/script.js"
/>

<Metadata />
<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-center" />

{#if !$page.route?.id?.includes(siteConfig.appUrl)}
	<Navigation />
{/if}

<main id="stashlist-app" data-os={$page.data.os}>
	<slot />
</main>

{#if !$page.route?.id?.includes(siteConfig.appUrl)}
	<Footer />
{/if}
