<script lang="ts">
	import Heading from "@repo/ui/components/heading";
	import Section from "@repo/ui/components/section";

    export let title: string;
    export let message = 'Nothing to show here';
</script>

<Section class="w-full h-full flex items-center justify-center flex-col max-w-[400px] mx-auto">
    <Heading tag="h2">{title}</Heading>
    <p class="text-muted-foreground mb-4 text-center last:mb-0">{message}</p>
    <slot />
</Section>