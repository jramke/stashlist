<script lang="ts">
	import { cn } from "$lib/utils";
	import { buttonVariants } from "$lib/components/ui/button";
	import { siteConfig } from "$lib/config/site";
	import Navlink from "./Navlink.svelte";
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex h-14 max-w-screen-2xl items-center">
		<div class="mr-4 hidden md:flex">
			<a href="/" class="mr-6 flex items-center space-x-2">
				<span class="font-bold sm:inline-block">
					{siteConfig.name}
				</span>
			</a>
			<nav class="flex items-center gap-6 text-sm">
				<Navlink path={siteConfig.appUrl}>App</Navlink>
			</nav>
		</div>
		<div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
			<div class="w-full flex-1 md:w-auto md:flex-none">
				CommandMenu
			</div>
			<nav class="flex items-center">
				<a href={siteConfig.links.github} target="_blank" rel="noopener noreferrer">
					<div
						class={cn(
							buttonVariants({
								size: "sm",
								variant: "ghost"
							}),
							"w-9 px-0"
						)}
					>
						<span>GitHub</span>
					</div>
				</a>
				<a href={siteConfig.links.twitter} target="_blank" rel="noreferrer">
					<div
						class={cn(
							buttonVariants({
								size: "sm",
								variant: "ghost"
							}),
							"w-9 px-0"
						)}
					>
						<span>X</span>
					</div>
				</a>
				ModeToggle
			</nav>
		</div>
	</div>
</header>