<script lang="ts">
	import type { PageData, ActionData } from "./$types";
	import { Dashboard } from "@repo/analytics";

	export let form: ActionData;
	
</script>

<Dashboard {form} />