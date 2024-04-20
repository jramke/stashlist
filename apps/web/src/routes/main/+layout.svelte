<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Topbar } from '$lib/components/app/nav';
	import { CommandMenu } from '$lib/components/app/command';
	import { ScrollArea } from '@repo/ui/components/scroll-area';

</script>

<CommandMenu />

<Section class="container flex flex-col min-h-[100vh]">
	<!-- <div class="sticky w-full top-0 bg-background/80 backdrop-blur z-50"> -->
		<Topbar />
	<!-- </div> -->
	<Section class="flex-grow grid">
		<!-- <ScrollArea class="max-h-[755px] pb-5"> -->
			<slot />
		<!-- </ScrollArea> -->
	</Section>
</Section>
