<script lang="ts">
	import type { TODO } from '$lib/types';
	
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';
	import { Link } from '$lib/components/app/nav';
	import { Inbox, Logo, Stash } from '@repo/ui/icons';
	import { Separator } from '@repo/ui/components/separator';
	
	import SidebarUserinfo from './sidebar-userinfo.svelte';
	import SidebarGroups from './sidebar-groups.svelte';
	import SidebarNew from './sidebar-new.svelte';

	let busy = false;

	let savesData: TODO;
	$: $page.data.saves.then(data => savesData = data);

</script>

<aside class="sticky top-0 h-screen flex-[350px] bg-card">
	<div class="flex flex-col items-start h-full overflow-hidden py-5">
		<div class="px-5 flex w-full items-center justify-between gap-3 pb-5">
			<div class="flex items-center px-3">
				<Logo class="me-3 h-5 w-5 text-primary" />
				<p class="text-xl font-bold">
					{siteConfig.name}
				</p>
			</div>
			<div>
				<SidebarNew {busy} />
			</div>
		</div>
		<div class="px-5 flex w-full flex-col items-start">
			<Link path={siteConfig.appUrl}>
				<div class="flex items-center">
					<Stash class="me-2 h-4 w-4" />
					All stashes
				</div>
				{#if savesData?.items?.length}
					<div class="ms-auto">{savesData?.items?.length}</div>
				{/if}
			</Link>
			<Link path={siteConfig.appUrl + '/unsorted'}>
				<div class="flex items-center">
					<Inbox class="me-2 h-4 w-4" />
					Unsorted
				</div>
				{#if savesData?.noGroupCount}
					<div class="ms-auto">{savesData.noGroupCount}</div>
				{/if}
			</Link>
		</div>
		<SidebarGroups {savesData} {busy} />
		<div class="w-full mt-auto px-8">
			<Separator />
			<div class="pt-3 relative">
				<SidebarUserinfo />
			</div>
		</div>
	</div>
</aside>
