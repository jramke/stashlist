<script lang="ts">
	import { Button } from '@repo/ui/components/button';
	import { siteConfig } from '@repo/constants';
 	import { Link } from '$lib/components/app/nav';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { ChevronDown, Logo } from '@repo/ui/icons';
	import * as DropdownMenu from '@repo/ui/components/dropdown-menu';

</script>

<header
	class="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex items-center py-4">
		<div class="mr-4 flex">
			<a href={$page.data.user ? siteConfig.appUrl : '/'} class="mr-6 flex items-center space-x-2">
				<Logo class="h-6 w-6" />
				<span class="text-lg font-bold sm:inline-block">
					{siteConfig.name}
				</span>
			</a>
		</div>
		<div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
			<nav class="flex items-center gap-6">
				<DropdownMenu.Root preventScroll={false}>
					<DropdownMenu.Trigger asChild let:builder>
						<Button builders={[builder]} variant="nav">
							Products
							<ChevronDown class="size-4 ms-1 mt-0.5" />
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="max-w-[250px]">
						<DropdownMenu.Item class="flex flex-col items-start gap-1" href={siteConfig.releaseUrl}>
							Desktop launcher
							<span class="text-muted-foreground text-xs">Acces Stashlist directly from your desktop</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item class="flex flex-col items-start gap-1" href="/extension">
							Browser extension
							<span class="text-muted-foreground text-xs">Quickly save your resources to Stashlist</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				{#if $page.data.user}
					<Link path={siteConfig.appUrl}>Go to app</Link>
				{/if}
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
