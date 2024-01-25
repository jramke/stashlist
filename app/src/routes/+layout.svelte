<script>
	import '../app.pcss';
	import '$lib/styles/app.css';

	import { ModeWatcher } from 'mode-watcher';
	// import { user } from '$lib/db/user';

	// $: console.log($user);
</script>

<ModeWatcher />
<slot />
