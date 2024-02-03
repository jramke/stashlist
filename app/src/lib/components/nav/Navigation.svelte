<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { siteConfig } from '$lib/config/site';
	import Link from './Link.svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex max-w-screen-2xl items-center py-4">
		<div class="mr-4 hidden md:flex">
			<a href={$page.data.user ? siteConfig.appUrl : '/'} class="mr-6 flex items-center space-x-2">
				<span class="text-lg font-bold sm:inline-block">
					{siteConfig.name}
				</span>
			</a>
			<nav class="flex items-center gap-6">
				<Link path={siteConfig.appUrl}>App</Link>
			</nav>
		</div>
		<div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
			<div class="w-full flex-1 md:w-auto md:flex-none">CommandMenu</div>
			<nav class="flex items-center gap-6">
				{#if $page.data.user}
					<form method="post" action="/logout" use:enhance>
						<Button type="submit" variant="outline">Logout</Button>
					</form>
				{:else}
					<Button href="/login">Login</Button>
					<Button href="/register" variant="outline">Register</Button>
				{/if}
				ModeToggle
			</nav>
		</div>
	</div>
</header>
