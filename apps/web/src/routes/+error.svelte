<script>
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';
	import Section from '@repo/ui/components/section';
	import Heading from '@repo/ui/components/heading';
	import { Button } from '@repo/ui/components/button';
	
</script>

<Section>
	<div class="container flex min-h-[70vh] max-w-[800px] flex-col items-center justify-center gap-6">
		<p class="text-lg text-muted-foreground">404 Error</p>
		<Heading tag="h1" class="mb-3">Page not found!</Heading>
		{#if $page.data.user}
			<Button href={siteConfig.appUrl}>Go back</Button>
		{:else}
			<Button href={'/'}>Go back</Button>
		{/if}
	</div>
</Section>
