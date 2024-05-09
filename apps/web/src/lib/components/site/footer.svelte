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
        <div class="grid md:grid-cols-2 gap-6">
            <div class="flex flex-col flex-wrap justify-end gap-2">
                <a href={$page.data.user ? siteConfig.appUrl : '/'} class="flex items-center gap-2">
                    <Logo class="h-5 w-5" />
                    <span class="text-lg font-bold sm:inline-block">
                        {siteConfig.name}
                    </span>
                </a>
                <span class="text-sm text-muted-foreground">
                    Made by 
                    <a href="https://joostramke.com" target="_blank" class="underline underline-offset-4">
                        Joost
                    </a>
                </span>
            </div>
            <div class="flex flex-col flex-wrap justify-end gap-2 md:text-right">
                <div class="text-sm text-muted-foreground">
                    <a href="/privacy" class="underline underline-offset-4">
                        Privacy Policy
                    </a>
                </div>
                <span class="text-sm text-muted-foreground">
                    Copyright © {new Date().getFullYear()} Stashlist. All rights reserved.
                </span>
            </div>
        </div>
    </footer>
</Section>