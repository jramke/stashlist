<script lang="ts">
	import type { PageData, ActionData } from "./$types";
	import { Dashboard } from "@repo/analytics";

	export let form: ActionData;
	export let data: PageData;

</script>

<Dashboard {form} {data} />