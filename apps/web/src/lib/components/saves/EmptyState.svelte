<script lang="ts">
	import Heading from "@repo/ui/components/heading";

    export let title: string;
    export let message = 'Nothing to show here';
</script>

<div class="w-full h-full flex items-center justify-center flex-col">
    <Heading tag="h2">{title}</Heading>
    <p class="text-muted-foreground mb-4 last:mb-0">{message}</p>
    <slot />
</div>