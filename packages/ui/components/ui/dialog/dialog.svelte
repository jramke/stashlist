<script lang="ts">
    import { Dialog as DialogPrimitive } from 'bits-ui';
    import { scaleMain, resetMain } from '$ui/utils';

    type $$Props = DialogPrimitive.Props;
    export let open: $$Props["open"] = false;

    $: if (open === true) {
        scaleMain();
    } else {
        resetMain();
    }

</script>

<DialogPrimitive.Root bind:open {...$$restProps} >
    <slot />
</DialogPrimitive.Root>