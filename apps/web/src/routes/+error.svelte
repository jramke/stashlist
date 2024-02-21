<script>
	import Section from '@repo/ui/components/section';
	import Heading from '@repo/ui/components/heading';
	import { Button } from '@repo/ui/components/button';
</script>

<Section>
	<div class="container flex min-h-[70vh] max-w-[800px] flex-col items-center justify-center gap-6">
		<p class="text-lg text-muted-foreground">404 Error</p>
		<Heading tag="h1" class="mb-3">Page not found!</Heading>
		<Button href={'/'}>Go back</Button>
	</div>
</Section>
