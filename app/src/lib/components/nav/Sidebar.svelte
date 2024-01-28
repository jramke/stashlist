<script lang="ts">
	import { siteConfig } from '$lib/config/site';
	import Sidebarlink from '$lib/components/nav/Sidebarlink.svelte';
	import { Separator } from '$lib/components/ui/separator';
</script>

<div class="flex flex-col items-start">
	<Sidebarlink path={siteConfig.appUrl}>All stashs</Sidebarlink>
	<Separator />
	<Sidebarlink path={siteConfig.appUrl + '/snippets'}>Snippets</Sidebarlink>
</div>
