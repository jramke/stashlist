<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Groups, Topbar } from '$lib/components/app/nav';
	import { onMount } from 'svelte';

	onMount(() => {
		document.body.classList.add('overflow-y-hidden');
		return () => document.body.classList.remove('overflow-y-hidden');
	});

</script>

<Section class="container">
	<Topbar />
	<Groups />
	<Section class="scroll-area h-full" id="main-scrollarea">
		<slot />
	</Section>
</Section>
