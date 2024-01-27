<script>
	import '@fontsource-variable/plus-jakarta-sans';
	import '../app.pcss';
	import '$lib/styles/app.css';

	import { ModeWatcher } from 'mode-watcher';
	import Navigation from '$lib/components/nav/Navigation.svelte';

</script>

<ModeWatcher />
<Navigation />
<main>
	<slot />
</main>
