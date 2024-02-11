<script lang="ts">
	import Section from '$lib/components/ui/section';
	import Sidebar from '$lib/components/nav/Sidebar.svelte';
	import Topbar from '$lib/components/nav/Topbar.svelte';
</script>

<div class="flex">
	<Sidebar />
	<div class="w-full">
		<Topbar />
		<Section class="p-5 pt-0">
			<slot />
		</Section>
	</div>
</div>
