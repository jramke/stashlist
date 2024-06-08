<script lang="ts">
	import '@repo/ui/globals.pcss';
	import '../../../app.pcss';
	
	import { Toaster } from '@repo/ui/components/sonner';
    import Stash from './Stash.svelte';
    import CommandMenu from './CommandMenu.svelte';
</script>

<div>

	<Toaster position="bottom-center" />
	<Stash />
	<CommandMenu />

</div>
