<script>
	import { siteConfig } from '$lib/config/site';
	import Heading from '@repo/ui/components/heading';
    import Section from '@repo/ui/components/section';
	import { Shortcut } from '@repo/ui/components/shortcut';
	import Typography from '@repo/ui/components/typography';

</script>

<Section class="py-20">
    <Typography class="container">
        <Heading tag="h1" class="text-3xl">Help and useful informations</Heading>
        <p class="font-semibold mb-0">Stashes</p>
        <p class="mt-0 text-muted-foreground">Stashes are saved web pages or images. You can stash a page with the extension (right click or <Shortcut class="inline-flex" keys={['command', 'B']} />) or by pasting the URL in the input field. We are planning to enable stashing of code snippets for direct use in VS Code.</p>

        <p class="font-semibold mb-0">Metadata</p>
        <p class="mt-0 text-muted-foreground">When you stash a new page the metadata is fetched and stored in the database. If you stash a page using the extension, you can edit the title or description before its stored. If there is no favicon or og image a random peristent gradient is rendered as fallback.</p>
        
        <p class="font-semibold mb-0">Groups</p>
        <p class="mt-0 text-muted-foreground">You can create groups to organize your stashes. Each stash can belong to multiple groups. You can edit the group names and order via drag and drop. If you delete a group the stashes remain you can find them in the <a href={siteConfig.appUrl + '/unsorted'}>unsorted</a> page.</p>

        <p class="font-semibold mb-0">Live view</p>
        <p class="mt-0 text-muted-foreground">The live view is a way to see your stashes side by side interactive and in realtime. You can toggle it by pressing <Shortcut class="inline-flex" keys={['command', 'G']} />.</p>
        
        <p class="font-semibold mb-0">Command Dialog</p>
        <p class="mt-0 text-muted-foreground">The command dialog provides a quick way to navigate through the app. You can open it by pressing <Shortcut class="inline-flex" keys={['command', 'K']} />. You can search for stashes and groups or execute various actions, all from your keyboard.</p>

        <p class="font-semibold mb-0">Navigation</p>
        <p class="mt-0 text-muted-foreground">You can easily navigate through the stashes using the arrow keys.</p>

        <p class="font-semibold mb-0">Shortcuts</p>
        <p class="mt-0 text-muted-foreground">There are several shortcuts available. You can also see them in the command dialog.</p>
        <div class="text-muted-foreground">
            <div class="flex gap-3">
                <Shortcut keys={['command', 'K']} />
                Open command dialog
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'A']} />
                Show all stashes
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'U']} />
                Show unsorted stashes
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'L']} />
                Change layout
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'G']} />
                Toggle the live view
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'E']} />
                Edit current stash
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'D']} />
                Delete current stash
            </div>
            <div class="flex gap-3">
                <Shortcut keys={['command', 'C']} />
                Copy current stash url
            </div>
        </div>

    </Typography>
</Section>