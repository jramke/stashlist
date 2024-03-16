<script>
	import Footer from '$lib/components/site/Footer.svelte';
	import Section from '@repo/ui/components/section';
	import Heading from '../../../../../packages/ui/components/ui/heading/heading.svelte';
	import { Button } from '@repo/ui/components/button';

</script>

<Section class="py-20">
	<div class="container max-w-[73ch]">
		<div class="text-lg leading-normal">
			<h1 class="font-bold text-4xl mb-3">
				Get the stashlist extension!
			</h1>
			<p class="text-muted-foreground">
				Get the stashlist extension for your browser to easily stash your items.
			</p>
            <div class="grid grid-cols-3 gap-6 pt-10">
                <div class="rounded-lg p-4 border">
                    <Heading tag="h3">Chrome</Heading>
                    <Button variant="outline">Get extension</Button>
                </div>
                <div class="rounded-lg p-4 border">
                    <Heading tag="h3">Firefox</Heading>
                    <Button variant="outline">Get extension</Button>
                </div>
            </div>
		</div>
	</div>
</Section>

<Footer />
