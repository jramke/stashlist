<script lang="ts">
	import Heading from "@repo/ui/components/heading";

    export let title: string;
    export let message = 'Nothing to show here';
</script>

<div class="w-full h-full p-4 lg:p-8">
    <div class="w-full h-full flex items-center justify-center flex-col border border-dashed rounded-lg p-4 lg:p-8">
        <Heading tag="h2">{title}</Heading>
        <p class="text-muted-foreground mb-4 text-center last:mb-0">{message}</p>
        <slot />
    </div>
</div>