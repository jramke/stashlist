<script lang="ts">
	import Section from '$lib/components/Section.svelte';
	import Sidebar from '$lib/components/nav/Sidebar.svelte';

</script>

<div class="flex h-screen">
	<Sidebar />
	<Section class="px-10">
		<slot />
	</Section>
</div>
