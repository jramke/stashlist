<script lang="ts">
	import { SavesList } from '$lib/components/app/saves';
	import { page } from '$app/stores';
	import { itemsStore } from '$lib/stores';
	import { browser } from '$app/environment';

	const editId = $page.url.searchParams.get('edit-stash');
	if (editId && browser) {
		const { openEditDialog } = itemsStore;
		window.location.hash = '';
		history.replaceState(null, '', $page.url.pathname);
		openEditDialog(editId);
	}
	
</script>


<SavesList saves="all" />

