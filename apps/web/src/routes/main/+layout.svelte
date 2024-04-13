<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Topbar } from '$lib/components/app/nav';
	import { CommandMenu } from '$lib/components/app';
	import { ScrollArea } from '@repo/ui/components/scroll-area';

</script>

<CommandMenu />

<Section class="container h-[100vh] h-[100dvh]">
	<!-- <div class="sticky w-full top-0 bg-background/80 backdrop-blur z-50"> -->
		<Topbar />
	<!-- </div> -->
	<Section>
		<!-- <ScrollArea class="max-h-[755px] pb-5"> -->
			<slot />
		<!-- </ScrollArea> -->
	</Section>
</Section>
