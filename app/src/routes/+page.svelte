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
			<Button href="/register">Getting started</Button>
			<Button variant="outline">Install extension</Button>
		</div>
	</div>
</Section>
<Section>
	Hero Section:

Stashlist: Your Ultimate Tool for Developers and Designers

Welcome to Stashlist, where inspiration meets organization effortlessly. Say goodbye to scattered bookmarks and endless tabs – Stashlist is your all-in-one solution for saving websites, code snippets, images, and more with a simple click.

Features Section:

Streamline Your Workflow

Stashlist empowers you to curate your digital workspace efficiently:

Save Anything, Anytime: Whether it's a stunning website, a genius code snippet, or a captivating blog post, Stashlist lets you save it all in one centralized location.

Seamless Web Extension: With our intuitive browser extension, you can stash a page with just two clicks or a quick keyboard shortcut, ensuring that you never miss out on valuable resources again.

Organize with Ease: Tag and categorize your stashed items for easy retrieval. Say hello to a clutter-free browsing experience.

Unlock Creativity

Let Stashlist be your creative vault:

Inspiration on Demand: Browse through your stashed collection whenever you need a burst of inspiration. Whether it's for a new project or overcoming a creative block, Stashlist has you covered.

Visualize Ideas: Save images and screenshots alongside your web finds, turning Stashlist into your visual mood board.

Enhanced Integration

Experience seamless integration with your development environment:

VSCode Extension: Take your productivity to the next level with our upcoming VSCode extension. View, create, delete, and directly utilize your stashed snippets within your favorite code editor.
Move Beyond Git Repositories

Are you tired of cluttered git repositories for storing code snippets? Make the switch to Stashlist:

Effortless Organization: Say goodbye to digging through endless repositories. With Stashlist, your code snippets are neatly organized and easily accessible, saving you valuable time.

Collaborate with Ease: Share your stashed snippets effortlessly with teammates, fostering collaboration and streamlining your workflow.

Join the Stashlist Community

Ready to elevate your workflow? Join thousands of developers and designers who trust Stashlist to organize their digital lives efficiently. Sign up today and experience the power of streamlined productivity.

[Get Started]

Still have questions? [Contact Us]

Don't let inspiration slip away – Stash it with Stashlist.
</Section>
