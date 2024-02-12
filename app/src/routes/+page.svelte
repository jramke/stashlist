<script>
	import { Button } from '$lib/components/ui/button';
	import Section from '$lib/components/ui/section';
	import Stash from '$lib/icons/stash.svelte';
	
</script>

<Section class="py-20">
	<div class="container max-w-[800px] flex flex-col items-center">
		<div class="relative w-16 h-16 mb-10">
			<Stash class="w-full h-full absolute inset text-primary" />
			<Stash class="w-full h-full absolute inset transition opacity-0 hover:opacity-100 blur-sm text-primary" />
		</div>
		<h1 class="text-center text-6xl">The bookmark tool for developers and designers!</h1>
		<p class="text-center text-muted-foreground text-lg pt-10">Stash wesbites, code snippets, images and more in one place!</p>
		<div class="flex gap-6 justify-center pt-10">
			<Button href="/register">Create account</Button>
			<Button variant="outline">Get extension</Button>
		</div>
	</div>
</Section>
