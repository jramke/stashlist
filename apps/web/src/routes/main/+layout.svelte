<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Sidebar, Topbar } from '$lib/components/app/nav';
	import { onMount } from 'svelte';

	onMount(() => {
		document.body.classList.add('overflow-y-hidden');
		return () => document.body.classList.remove('overflow-y-hidden');
	});

</script>

<div class="flex">
	<Sidebar />
	<div class="w-full">
		<Topbar />
		<Section class="p-5 scroll-area h-full border-l" id="main-scrollarea">
			<slot />
		</Section>
	</div>
</div>
