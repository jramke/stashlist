<script lang="ts">
	import Section from "@repo/ui/components/section";
    import { Button } from '@repo/ui/components/button';
	import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
    import { Sun, Moon } from '@repo/ui/icons';
    import { setMode, resetMode } from 'mode-watcher';
    import { page } from '$app/stores';
    import { Logo } from '@repo/ui/icons';
    import { siteConfig } from '$lib/config/site';

</script>

<Section class="border-t">
    <footer class="container">
        <a href={$page.data.user ? siteConfig.appUrl : '/'} class="mr-6 flex items-center space-x-2">
            <Logo class="h-5 w-5" />
            <span class="text-lg font-bold sm:inline-block">
                {siteConfig.name}
            </span>
        </a>
        <div class="w-full flex flex-wrap justify-between items-center">
            <span class="text-sm text-muted-foreground">
                Copyright © {new Date().getFullYear()} Stashlist. All rights reserved.
            </span>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild let:builder>
                    <Button builders={[builder]} variant="outline" size="icon">
                        <Sun
                            class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                        />
                        <Moon
                            class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                        />
                        <span class="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                    <DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
                    <DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
                    <DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    </footer>
</Section>