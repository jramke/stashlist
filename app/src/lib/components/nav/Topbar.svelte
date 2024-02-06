<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Sun, Moon } from 'lucide-svelte';
	import { setMode, resetMode } from 'mode-watcher';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	let name = $page.data.user.name;
</script>

<div class="flex gap-5 p-5">
	<Input type="search" placeholder="Search" />
	<div class="flex items-center gap-3">
		<Avatar.Root>
			<Avatar.Image src={`${base}/gradient.png`} alt={name} />
			<Avatar.Fallback>{name.substring(0, 2).toUpperCase()}</Avatar.Fallback>
		</Avatar.Root>
		<p class="whitespace-nowrap">
			<span class="text-muted-foreground">Hi, </span>
			<span class="font-bold">{name}</span>
		</p>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild let:builder>
				<Button builders={[builder]} variant="outline" size="icon">
					<Sun
						class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
					/>
					<Moon
						class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>
