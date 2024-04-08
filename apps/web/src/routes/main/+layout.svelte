<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Topbar } from '$lib/components/app/nav';
	import { CommandMenu } from '$lib/components/app';

</script>

<CommandMenu />

<Section class="container">
	<div class="sticky w-full top-0 bg-background/80 backdrop-blur z-50">
		<Topbar />
	</div>
	<Section>
		<slot />
	</Section>
</Section>
