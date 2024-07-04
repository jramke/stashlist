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
		LogoPoof
	} from '$lib/components/site/logos';
	import Typography from '@repo/ui/components/typography';
	import { Button } from '@repo/ui/components/button';
	import Heading from '@repo/ui/components/heading';
	// import { Vault } from '$lib/components/site';
	import { Motion, AnimateSharedLayout } from 'svelte-motion';

	let playPoofs = false;

	let moveGithubIcon = false;

	const features = [
		{
			title: 'Minimalistic UI',
			description:
				'Modern interface without missing any feature to help you organize your bookmarks.'
		},
		{
			title: 'Keyboard focus',
			description: 'Command menu with a lot of shortcuts for a faster workflow and navigation.'
		},
		{
			title: 'Grouping system',
			description: 'Tags to organize your bookmarks in a way that makes sense to you.'
		},
		{
			title: 'Browser extension',
			description: 'Save wesbites or images directly from your browser.'
		},
		{
			title: 'Metadata',
			description: 'Automatically fetches metadata for your bookmarks.'
		},
		{
			title: 'More infos',
			description:
				'Get more information about the features and functionality <a class="underline underline-offset-4" href="/help">here</a>.'
		}
	];
</script>

<Section class="pt-20 overflow-hidden">
	<div class="container">
		<div class="flex flex-col xl:flex-row xl:items-center gap-16 xl:gap-36">
			<div class="flex flex-col gap-10 max-w-2xl xl:max-w-xl flex-shrink-0">
				<Heading tag="h1" class="mb-0">The Creative Vault for your resources</Heading>
				<p class="text-muted-foreground text-xl">
					Stashlist is an open source bookmark manager that helps you stash all your resources in one place.
				</p>
				<div class="flex gap-6">
					<Button href="/login">Getting started</Button>
					<Button href="https://github.com/jramke/stashlist" variant="link" target="_blank">View on Github</Button>
				</div>
			</div>

			<div class="max-w-none flex-none">
				<div class="w-fit rounded-xl overflow-hidden p-2 border lg:rounded-2xl bg-accent/70 text-accent-foreground shadow-inner shadow-popover/50 border-accent lg:p-3">
					<img
						class="w-[80rem] rounded-md border shadow-[0_0px_20px_0px_rgba(0,0,0,1)] border-primary-foreground/10 sm:max-w-3xl md:max-w-4xl lg:max-w-none"
						src="/screenshot.png"
						alt="Screenshot of the stashlist app UI"
					/>
				</div>
			</div>
		</div>
	</div>
	  
</Section>

<AnimateSharedLayout>
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
						<LogoPoof bind:playPoof={playPoofs}>
							<Chrome class="-mt-2 inline h-6 w-6" />
							<Arc class="-ms-4 -mt-2 inline h-7 w-7 rotate-[10deg]" />
						</LogoPoof>
						browser
					</span>
					and
					<span class="whitespace-nowrap">
						<LogoPoof bind:playPoof={playPoofs} delay={100}>
							<TwitterBookmark class="-mt-2 inline h-6 w-6" />
						</LogoPoof>
						Twitter
					</span>
					bookmarks are scattered like confetti. Your liked
					<span class="whitespace-nowrap">
						<LogoPoof bind:playPoof={playPoofs} delay={200}>
							<Codepen class="text-foreground -mt-2 inline h-6 w-6" />
						</LogoPoof>
						CodePens
					</span>
					and
					<span class="whitespace-nowrap">
						<LogoPoof bind:playPoof={playPoofs} delay={300}>
							<Dribbble class="-mt-2 inline h-6 w-6" />
						</LogoPoof>
						Dribbble
					</span>
					shots are lost in the mix. Oh, and let's not even think about diving deep into
					<span class="whitespace-nowrap">
						your
						<!-- <Motion let:motion layoutId="githubIcon">
							<div use:motion class="relative inline-block w-[25px]">
								<GithubStar class="absolute right-[-4px] top-[-1px] h-4 w-4 rotate-[5deg]" />
								<GitHub class="-mt-2 inline h-6 w-6" />
							</div>
						</Motion> -->
						<LogoPoof bind:playPoof={playPoofs} delay={400}>
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
						<button class="focusable">
							<Logo class="-mt-1 me-1 ms-1 inline h-6 w-6" />
						</button>
						<!-- {#if !playPoofs}
							<div class="absolute hidden lg:flex w-32 top-[160%] right-[70%] -rotate-[12deg] flex-row-reverse gap-2 text-muted-foreground">
								<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165.33 34.93"><defs><style>.cls-1{fill: currentColor;}</style></defs><path class="cls-1" d="M-1640.92,1584.91a30.38,30.38,0,0,0-4.76,8.73c-.31.86-.6,1.74-.88,2.66s-.54,1.81-.79,2.76c-.49,1.9-.89,3.92-1.22,6-.17,1.14-1.18.87-1.87-.38-2.42-4.37-4.77-8.93-6.92-13.58a190,190,0,0,1-34,12.59,227.79,227.79,0,0,1-35.7,6.33c-26.34,2.66-53.28.84-78.73-6.52-.71-.19-.14-2.27.56-2.11l9.2,2.07a229.71,229.71,0,0,0,78,2.45l3.85-.58c1.28-.19,2.56-.37,3.83-.66l7.61-1.53c2.54-.52,5-1.24,7.55-1.85l3.77-.94,3.72-1.12a236.55,236.55,0,0,0,29.16-10.67c-1.45-3.27-2.8-6.56-4-9.84a1.67,1.67,0,0,1-.11-.74c-.64-.26-1.12-1.76-.49-1.73a28.09,28.09,0,0,1,4.4.57c1.53.32,3.11.74,4.7,1.18a88.87,88.87,0,0,1,10,3.65l.17-.08c.26-.13.58.14.82.5l.92.39C-1641.3,1582.84-1640.45,1584.34-1640.92,1584.91Zm-13.95-1.16a2.05,2.05,0,0,1,.24.26c.09.11.16.22.24.33l-.26-.52Zm-.71-.22c-.83-.28-1.66-.62-2.48-1l1,1.75c.24-.33.78-.18,1.21.7l.19.41-.17-1.2A.68.68,0,0,1-1655.58,1583.53Zm5.31,17.71,0-.31a1.14,1.14,0,0,1-.26-.24c-.15-.21-.28-.43-.43-.64Zm.45-2.2.07-.3a.43.43,0,0,1-.14.13Zm.17-.75c.37-1.53.77-3,1.23-4.37a.84.84,0,0,1-.24-.16c-.41-.44-.81-.9-1.21-1.36-.22.37-.75.33-1.23-.34l-1-1.38a36.67,36.67,0,0,0,2.27,6.8A1.81,1.81,0,0,1-1649.65,1598.29Zm1.73-5.81q.27-.81.57-1.56l-2.19-2.62,0,0a1.86,1.86,0,0,1,.26.94C-1648.79,1590.34-1648.34,1591.4-1647.92,1592.48Zm1.65-4.06a29.55,29.55,0,0,1,2-3.52,1.52,1.52,0,0,0-.52-.11c.14.46.08.86-.33.83l-.66-.07a3.48,3.48,0,0,0-.15,1.37c0,.72-.6.64-1,.18C-1646.76,1587.51-1646.51,1588-1646.27,1588.42Zm-.27-5.43c-2.58-1-5.06-1.79-7.46-2.49s-4.84-1.45-7.19-2.07a.6.6,0,0,1,.06.11c.23.49.45,1,.68,1.48a.29.29,0,0,1,.44-.16,45.42,45.42,0,0,0,5,2c.21-.14.55-.06.9.29.24.08.49.17.72.23.16-.24.47-.25.84.19l0,0c.9.21,1.8.38,2.69.51l0-.07a3.93,3.93,0,0,1,3,0Zm-10.33,4.89.3-.13c-.71-1.42-1.46-2.82-2.28-4.17Zm1.14,2.46.08.18a.78.78,0,0,1,.05-.24Z" transform="translate(1806.11 -1576.3)"></path></svg>
								<span class="text-xs font-normal flex-shrink-0">Click me</span>
							</div>
						{/if} -->
					</span>
					Stashlist — Your Creative Vault
				</h2>
			</div>
		</Typography>
	</Section>
	
	<!-- <Section class="py-32">
		<div class="container">
			<div class="flex justify-center">
				<div class="relative">
					<Vault />
					<div class="absolute flex items-center justify-center inset-0 border-red-500 border">
						{#if moveGithubIcon}
							<Motion let:motion style={{ position: 'absolute' }} transition={{ duration: 1 }} layoutId="githubIcon">
								<div use:motion class="relative inline-block w-[25px]">
									<GithubStar class="absolute right-[-4px] top-[-1px] h-4 w-4 rotate-[5deg]" />
									<GitHub class="-mt-2 inline h-6 w-6" />
								</div>
							</Motion>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</Section> -->
</AnimateSharedLayout>

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