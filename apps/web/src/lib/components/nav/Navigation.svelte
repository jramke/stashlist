<script lang="ts">
	import { Button } from '@repo/ui/components/button';
	import { siteConfig } from '$lib/config/site';
	import Link from './Link.svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { Logo } from '@repo/ui/icons';
	
</script>

<header
	class="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex items-center py-4">
		<div class="mr-4 flex">
			<a href={$page.data.user ? siteConfig.appUrl : '/'} class="mr-6 flex items-center space-x-2">
				<Logo class="h-5 w-5" />
				<span class="text-lg font-bold sm:inline-block">
					{siteConfig.name}
				</span>
			</a>
		</div>
		<div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
			<nav class="flex items-center gap-6">
				<!-- {#if $page.url.pathname === '/trendy'}
					<Link path="/">Looking for the minimalistic landingpage?</Link>
				{:else}
					<Link path="/trendy">Looking the trendy landingpage?</Link>
				{/if} -->
				{#if $page.data.user}
					<form method="post" action="/logout" use:enhance>
						<Button type="submit" variant="outline">Logout</Button>
					</form>
				{:else if $page.url.pathname !== '/login'}
					<Button href="/login" variant="outline">Login</Button>
				{/if}
					
			</nav>
		</div>
	</div>
</header>
