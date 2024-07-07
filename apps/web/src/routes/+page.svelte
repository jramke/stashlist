<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Logo, GitHub } from '@repo/ui/icons';
	import {
		TwitterBookmark,
		Chrome,
		Codepen,
		Dribbble,
		GithubStar,
		Arc,
		LogoPoof,
	} from '$lib/components/site/logos';
	import Typography from '@repo/ui/components/typography';
	import { Button } from '@repo/ui/components/button';
	import Heading from '@repo/ui/components/heading';
	import { Hero } from '$lib/components/site';

	const features = [
		{
			title: 'Minimalistic UI',
			description:
				'Modern interface without missing any feature to help you organize your bookmarks.'
		},
		{
			title: 'Desktop launcher',
			description:
				'Access Stashlist directly from your desktop with the raycast inspired desktop launcher.'
		},
		{
			title: 'Keyboard focus',
			description: 'Command menu with a lot of shortcuts for a faster workflow and navigation.'
		},
		{
			title: 'Browser extension',
			description: 'Save wesbites or images directly from your browser.'
		},
		{
			title: 'Grouping system',
			description: 'Tags to organize your bookmarks in a way that makes sense to you.'
		},
		{
			title: 'Metadata',
			description: 'Automatically fetches metadata for your bookmarks.'
		},
	];
</script>

<Section class="pt-24 overflow-hidden">
	<Hero>
		<Heading tag="h1" class="mb-0">The Creative Vault for your resources</Heading>
        <p class="text-muted-foreground text-xl mx-8">
            Stashlist is an open source bookmark manager that helps you stash all your resources in one place.
        </p>
        <div class="flex gap-6">
            <Button href="/login">Getting started</Button>
            <Button href="https://github.com/jramke/stashlist" variant="link" target="_blank">View on Github</Button>
        </div>
	</Hero>
</Section>

<Section>
	<div class="container">
		<div class="relative">
			<div class="rounded-xl overflow-hidden p-2 border lg:rounded-2xl bg-accent/70 text-accent-foreground shadow-inner shadow-popover/50 border-accent lg:p-3">
				<img
					class="w-full rounded-md border shadow-[0_0px_20px_0px_rgba(0,0,0,1)] border-primary-foreground/10 sm:max-w-3xl md:max-w-4xl lg:max-w-none"
					src="/screenshot.png"
					alt="Screenshot of the stashlist web app user interface"
				/>
			</div>
			<div class="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-background to-background/0"></div>
		</div>
	</div>
	  
</Section>

<Section>
	<Typography class="container">
		<div class="space-y-10 text-2xl font-medium leading-normal">
			<h2 class="text-4xl font-bold mt-0">Say goodbye to scattered bookmarks!</h2>
			<p>
				Starting a new project and can’t find that useful link you saved?
			</p>
			<p>
				Your
				<span class="whitespace-nowrap">
					<LogoPoof replacerLogoClass="-mt-2">
						<Chrome class="-mt-2 inline h-6 w-6" />
						<Arc class="-ms-4 -mt-2 inline h-7 w-7 rotate-[10deg]" />
					</LogoPoof>
					browser
				</span>
				and
				<span class="whitespace-nowrap">
					<LogoPoof replacerLogoClass="-mt-2">
						<TwitterBookmark class="-mt-2 inline h-6 w-6" />
					</LogoPoof>
					Twitter
				</span>
				bookmarks are scattered like confetti. Your liked
				<span class="whitespace-nowrap">
					<LogoPoof replacerLogoClass="-mt-2">
						<Codepen class="text-foreground -mt-2 inline h-6 w-6" />
					</LogoPoof>
					CodePens
				</span>
				and
				<span class="whitespace-nowrap">
					<LogoPoof replacerLogoClass="-mt-2">
						<Dribbble class="-mt-2 inline h-6 w-6" />
					</LogoPoof>
					Dribbble
				</span>
				shots are lost in the mix. Oh, and let's not even think about diving deep into
				<span class="whitespace-nowrap">
					your
					<LogoPoof replacerLogoClass="-mt-2">
						<div class="relative inline-block w-[25px]">
							<GithubStar class="absolute right-[-4px] top-[-1px] h-4 w-4 rotate-[5deg]" />
							<GitHub class="-mt-2 inline h-6 w-6" />
						</div>
					</LogoPoof>
					GitHub
				</span>
				stars, searching for that damn library.
			</p>
			<p>But what if there was a better way?</p>
			<h2 class="text-2xl font-bold">
				Introducing
				<span class="relative">
					<Logo class="-mt-1 me-1 ms-1 inline h-6 w-6" />
				</span>
				Stashlist — Your Creative Vault
			</h2>
		</div>
	</Typography>
</Section>

<Section>
	<Typography class="container">
		<div class="space-y-10">
			<h2 class="mt-0 text-center text-3xl font-bold">Features</h2>
			<div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
				{#each features as { title, description }}
					<div
						class="bg-card/30 hover:bg-card/60 h-full self-start rounded-lg border p-4 shadow transition hover:shadow-xl"
					>
						<h3 class="mt-0 w-[90%] text-lg">{title}</h3>
						<p class="text-muted-foreground leading-snug">
							{@html description}
						</p>
					</div>
				{/each}
			</div>
			<p class="text-muted-foreground text-center">
				Get more information about the features and functionality <a class="underline underline-offset-4" href="/help">here</a>.
			</p>
		</div>
	</Typography>
</Section>

<Section>
	<div class="container">
		<h2 class="text-center text-3xl font-bold">Go ahead, give it a try!</h2>
		<div class="mt-8 flex items-center justify-center gap-3">
			<Button href="/login">Getting started</Button>
			<Button href="https://github.com/jramke/stashlist" variant="link" target="_blank">
				View on Github
			</Button>
		</div>
	</div>
</Section>