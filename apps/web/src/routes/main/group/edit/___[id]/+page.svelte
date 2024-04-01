<script lang="ts">
	import { formSchema, type FormSchema } from "./schema";
	import type { TODO } from "$lib/types";
    import type { SuperValidated } from "sveltekit-superforms";

    import * as Form from "@repo/ui/components/form";
	import { Button } from "@repo/ui/components/button";
	import { invalidateAll } from "$app/navigation";

    export let data: {
        groups: TODO,
        isDialog: boolean,
    };
    // export let data: PageData;
    
    function onLegacyCancel() {
        history.back();
        invalidateAll();
    }

    $: console.log(data);

</script>
