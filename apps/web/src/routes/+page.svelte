<script>
	import Section from '@repo/ui/components/section';
	import { Logo, GitHub } from '@repo/ui/icons';
	import { TwitterBookmark, Chrome, Codepen, Dribbble, Behance, GithubStar, Arc, LogoPoof } from '$lib/components/site/logos';
	import Typography from '@repo/ui/components/typography';
	import { Button } from '@repo/ui/components/button';

	const features = [
		{
			title: 'Minimalistic UI',
			description: 'Modern interface without missing any feature to help you organize your bookmarks.'
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
			description: 'Get more information about the features and functionality <a class="underline underline-offset-4" href="/help">here</a>.'
		}
	];

</script>

<Section class="pt-20">
	<Typography class="container">
		<div class="text-2xl leading-normal font-medium space-y-10">
			<h1 class="font-bold text-4xl">
				Say goodbye to scattered bookmarks!
			</h1>
			<p>
				You starting a new project and remember you saved something useful a while ago for later, but where was it?
			</p>
			<p>
				You've got 
				<span class="whitespace-nowrap">
					<LogoPoof>
						<Chrome class="h-6 w-6 inline -mt-2" /> 
    					<Arc class="h-7 w-7 inline -ms-4 -mt-2 rotate-[10deg]" />
					</LogoPoof>
					browser 
				</span>
				and  
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<TwitterBookmark class="h-6 w-6 inline -mt-2" /> 
					</LogoPoof>
					Twitter
				</span>
				bookmarks scattered like confetti, and a graveyard of your liked 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<Codepen class="h-6 w-6 inline -mt-2 text-foreground" /> 
					</LogoPoof>
					CodePens,
				</span> 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<Dribbble class="h-6 w-6 inline -mt-2" /> 
					</LogoPoof>
					Dribbble
				</span> 
				shots and 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<Behance class="h-6 w-6 inline -mt-2" /> 
					</LogoPoof>
					Behance
				</span> 
				projects. Oh, and let's not forget diving deep into your 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<div class="w-[25px] inline-block relative">
							<GithubStar class="h-4 w-4 absolute top-[-1px] right-[-4px] rotate-[5deg]" /> 
							<GitHub class="h-6 w-6 inline -mt-2" />  
						</div>
					</LogoPoof>
					GitHub
				</span>  
				stars, searching for that damn library.
			</p>
			<p>
				But what if there was a better way?
			</p>
			<h2 class="font-bold text-2xl">
				Introducing <span><Logo class="h-6 w-6 inline -mt-1 me-1 ms-1" />Stashlist</span> — Your Creative Vault
			</h2>
		</div>
	</Typography>
</Section>
<Section>
	<div class="container">
		<img class="border rounded-xl shadow-xl" src="/screenshot.png" alt="Screenshot of the stashlist app UI">
	</div>
</Section>
<Section>
	<Typography class="container">
		<div class="space-y-10">
			<h2 class="font-bold text-3xl mt-0 text-center">
				Features
			</h2>
			<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
				{#each features as { title, description }}
					<div class="rounded-lg p-4 border self-start shadow bg-card/30 h-full transition hover:bg-card/60 hover:shadow-xl">
						<h3 class="mt-0 text-lg w-[90%]">{title}</h3>
						<p class="leading-snug text-muted-foreground">
							{@html description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</Typography>
</Section>
<Section class="py-16">
	<div class="container">
		<h2 class="font-bold text-3xl text-center">
			Go ahead, give it a try!
		</h2>
		<div class="flex justify-center gap-3 items-center mt-8">
			<Button href="/login">
				Getting started
			</Button>
			<Button href="https://github.com/jramke/stashlist" variant="link" target="_blank">
				View on Github
			</Button>
		</div>
	</div>
</Section>