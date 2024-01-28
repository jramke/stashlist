<script>
	import Section from '$lib/components/Section.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<Section>
	<div class="container flex min-h-[70vh] max-w-[800px] flex-col items-center justify-center gap-6">
		<p class="text-lg text-muted-foreground">404 Error</p>
		<Heading tag="h1" class="mb-3">Page not found!</Heading>
		<Button href={'/'}>Go back</Button>
	</div>
</Section>
