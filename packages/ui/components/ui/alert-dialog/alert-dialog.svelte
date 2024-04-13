<script lang="ts">
    import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
    import { scaleMain, resetMain } from '$ui/utils';

    type $$Props = AlertDialogPrimitive.Props;
    export let open: $$Props["open"] = false;

    $: if (open === true) {
        scaleMain();
    } else {
        resetMain();
    }

</script>

<AlertDialogPrimitive.Root bind:open {...$$restProps} >
    <slot />
</AlertDialogPrimitive.Root>