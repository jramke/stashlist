<script>
	import Footer from '$lib/components/site/Footer.svelte';
	import { Button } from '@repo/ui/components/button';
	import Section from '@repo/ui/components/section';
	import { Logo, GitHub } from '@repo/ui/icons';
	import TwitterBookmark from '$lib/components/landing/twitter-bookmark.svelte';
	import Chrome from '$lib/components/landing/chrome.svelte';
	import Arc from '$lib/components/landing/arc.svelte';
	import Codepen from '$lib/components/landing/codepen.svelte';
	import Dribbble from '$lib/components/landing/dribbble.svelte';
	import Behance from '$lib/components/landing/behance.svelte';
	import GithubStar from '$lib/components/landing/github-star.svelte';
	import LogoPoof from '$lib/components/landing/LogoPoof.svelte';


</script>

<Section class="py-20">
	<div class="container max-w-[73ch]">
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
						<Chrome class="h-7 w-7 inline -mt-2" /> 
    					<Arc class="h-8 w-8 inline -ms-4 -mt-2 rotate-[10deg]" />
					</LogoPoof>
					browser 
				</span>
				bookmarks scattered like confetti, 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<TwitterBookmark class="h-7 w-7 inline -mt-2" /> 
					</LogoPoof>
					Twitter
				</span>
				bookmarks lost in the noise, and a graveyard of your liked 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<Codepen class="h-7 w-7 inline -mt-2 text-foreground" /> 
					</LogoPoof>
					CodePens,
				</span> 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<Dribbble class="h-7 w-7 inline -mt-2" /> 
					</LogoPoof>
					Dribbble
				</span> 
				shots and 
				<span class="whitespace-nowrap"> 
					<LogoPoof>
						<Behance class="h-7 w-7 inline -mt-2" /> 
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
				stars, searching for that damn snippet or library.
			</p>
			<p>
				Sound familiar? It's the repeating cycle of searching, clicking, and hoping you'll stumble upon what you need. 
				<br>
				But what if there was a better way?
			</p>
			<h2 class="font-bold">
				Introducing <span class="text-primary"><Logo class="h-6 w-6 inline -mt-1 me-1 ms-1" />Stashlist</span> — Your Creative Vault
			</h2>
		</div>
	</div>
</Section>

<Footer />
