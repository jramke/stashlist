<script lang="ts">
    import { buttonVariants } from '@repo/ui/components/button';
    import { LogOut, GitHub, Google, Info, Command, Blocks, Unplug } from '@repo/ui/icons';
    import { enhance } from '$app/forms';
	import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
    import { page } from '$app/stores';
	import * as Avatar from '@repo/ui/components/avatar';
	import { onMount } from 'svelte';
	import { cn } from '@repo/ui/utils';
	import { commandMenuOpen, generateKeyDialogOpen } from '$lib/stores';
	import { Shortcut } from '@repo/ui/components/shortcut';
	import { siteConfig } from '$lib/config/site';
	import { goto } from '$app/navigation';
	import { GenerateKeyDialog } from '../connect';
    
    let logoutForm: HTMLFormElement;
    
    $: user = $page.data.user;
    $: userProvider = $page.data.userProvider;
    
    onMount(() => {
        document.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'q') {
                event.preventDefault();
                logoutForm.requestSubmit();
            }
            if (event.key === "h" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                goto('/help');
            }
        })
    })

</script>

<GenerateKeyDialog />

<form class="hidden" method="post" bind:this={logoutForm} action="/logout" use:enhance></form>

<DropdownMenu.Root>   
    <DropdownMenu.Trigger class="{cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}">
        <span class="sr-only">Open profile settings</span>
        <Avatar.Root>
            <Avatar.Image src={user.avatarUrl} alt="" />
            <Avatar.Fallback>{user.name.slice(0, 2)}</Avatar.Fallback>
        </Avatar.Root>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="min-w-[15rem]">
        <DropdownMenu.Label>
            <span class="text-base">{user.name}</span>
            <div class="text-muted-foreground flex items-center gap-1">
                {#if userProvider === 'google'}
                    <Google class="size-3" />
                {:else if userProvider === 'github'}
                    <GitHub class="size-3" />
                {/if}
                <span class="text-xs">{user.username}</span>
            </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
            <DropdownMenu.Item on:click={() => generateKeyDialogOpen.set(true)}>
                <Unplug class="me-2 h-4 w-4" />
                Generate API key
            </DropdownMenu.Item> 
            <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                    <Blocks class="mr-2 h-4 w-4" />
                    <span>Products</span>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent side="left">
                    <DropdownMenu.Item href={'/extension'}>Browser extension</DropdownMenu.Item> 
                    <DropdownMenu.Item href={'https://github.com/jramke/stashlist/releases/latest'}>Desktop launcher</DropdownMenu.Item> 
                </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
            <DropdownMenu.Item on:click={() => commandMenuOpen.set(true)}>
                <Command class="me-2 h-4 w-4" />
                Command Menu
                <DropdownMenu.Shortcut>
                    <Shortcut keys={['command', 'K']} />
                </DropdownMenu.Shortcut>
            </DropdownMenu.Item> 
            <DropdownMenu.Item href={'/help'}>
                <Info class="me-2 h-4 w-4" />
                Help
                <DropdownMenu.Shortcut>
                    <Shortcut keys={['command', 'H']} />
                </DropdownMenu.Shortcut>
            </DropdownMenu.Item> 
            <DropdownMenu.Separator />
            <DropdownMenu.Item on:click={() => logoutForm?.requestSubmit()}>
                <LogOut class="me-2 h-4 w-4" />
                Logout
                <DropdownMenu.Shortcut>
                    <Shortcut keys={['shift', 'command', 'Q']} />
                </DropdownMenu.Shortcut>
            </DropdownMenu.Item>
        </DropdownMenu.Group>
    </DropdownMenu.Content>
</DropdownMenu.Root>


