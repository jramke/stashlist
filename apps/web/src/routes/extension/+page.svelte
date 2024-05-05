<script>
	import Section from '@repo/ui/components/section';
	import Heading from '@repo/ui/components/heading';
	import { Button } from '@repo/ui/components/button';
	import { siteConfig } from '$lib/config/site';

</script>

<Section class="py-20">
	<div class="container max-w-[73ch]">
		<div class="text-lg leading-normal">
			<h1 class="font-bold text-4xl mb-3">
				Get the stashlist extension!
			</h1>
			<p class="text-muted-foreground">
				Install the extension for your browser to easily stash your items.
			</p>
            <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6 pt-10">
                <div>
                    <div class="rounded-lg p-4 border self-start">
                        <Heading tag="h3">Chrome</Heading>
                        <Button variant="outline" href={siteConfig.extensionUrl.chrome} target="_blank">Get extension</Button>
                    </div>
                    <p class="text-muted-foreground text-xs mt-2">Currently not working correctly.<br>See <a class="underline underline-offset-4" href="https://github.com/jramke/stashlist/issues/47" target="_blank">Github issue</a>.</p>
                </div>
                <div class="rounded-lg p-4 border self-start">
                    <Heading tag="h3">Firefox</Heading>
                    <Button variant="outline" disabled>Coming soon</Button>
                </div>
                <div class="rounded-lg p-4 border self-start">
                    <Heading tag="h3">Safari</Heading>
                    <Button variant="outline" disabled>Coming soon</Button>
                </div>
            </div>
		</div>
	</div>
</Section>


