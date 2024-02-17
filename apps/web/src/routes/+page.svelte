<script>
	import { Button } from '@ui/components/ui/button';
	import Heading from '@ui/components/ui/heading';
	import Section from '@ui/components/ui/section';
	import { Stash } from '@ui/icons';
	
</script>

<Section class="py-20">
	<div class="container max-w-[900px] flex flex-col items-center">
		<div class="relative w-16 h-16 mb-10">
			<Stash class="w-full h-full absolute inset text-primary" />
			<Stash class="w-full h-full absolute inset transition opacity-0 hover:opacity-100 blur-sm text-primary" />
		</div>
		<Heading tag="h1" class="text-center mb-0">The bookmark tool for developers and designers!</Heading>
		<p class="text-center text-muted-foreground text-lg pt-10">Welcome to Stashlist, where inspiration meets organization effortlessly. Say goodbye to scattered bookmarks and endless tabs – Stashlist is your all-in-one solution for saving websites, code snippets, images, and more with a simple click.</p>
		<div class="flex gap-6 justify-center pt-10">
			<Button href="/login">Getting started</Button>
			<Button variant="outline">Install extension</Button>
		</div>
	</div>
</Section>
