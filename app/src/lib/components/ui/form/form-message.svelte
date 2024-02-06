<script lang="ts">
	import { getForm } from 'formsnap';
	import { toast } from 'svelte-sonner';

	export let loading: boolean = false;

	const { message } = getForm();

	$: if ($message) {
		loading = false;
		if ($message.type === 'success') {
			toast.success($message.text);
		}
		if ($message.type === 'error') {
			toast.error($message.text);
		}
	}
</script>
