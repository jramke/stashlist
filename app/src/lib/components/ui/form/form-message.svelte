<script lang="ts">
	import { getForm } from 'formsnap';
	import { toast } from 'svelte-sonner';

	const { message } = getForm();

	$: if ($message) {
		if ($message.type === 'success') {
			toast.success($message.text);
		}
		if ($message.type === 'error') {
			toast.error($message.text);
		}
	}
</script>
