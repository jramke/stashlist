<script lang="ts">
	import Section from '$lib/components/Section.svelte';
	import Sidebar from '$lib/components/nav/Sidebar.svelte';
	// import type { PageData } from './$types';

	// export let data: PageData;
</script>

<Section>
	<div
		class="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10"
	>
		<aside
			class="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto md:sticky md:block"
		>
			<Sidebar />
		</aside>
		<div>
			<slot />
		</div>
	</div>
</Section>
