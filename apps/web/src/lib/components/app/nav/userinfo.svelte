<script lang="ts">
    import { Button, buttonVariants } from '@repo/ui/components/button';
    import { LogOut, ChevronsUpDown,Sun, Moon, Monitor, GitHub, Google } from '@repo/ui/icons';
    import { enhance } from '$app/forms';
	import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
    import { page } from '$app/stores';
	import * as Avatar from '@repo/ui/components/avatar';
	import { onMount } from 'svelte';
    import { setMode, resetMode } from 'mode-watcher';
	import { siteConfig } from '$lib/config/site';
	import { cn } from '@repo/ui/utils';
	import { commandMenuOpen } from '$lib/stores';
	import { Shortcut } from '@repo/ui/components/command';
    
    let logoutForm: HTMLFormElement;
    
    $: user = $page.data.user;
    $: userProvider = $page.data.userProvider;
    
    onMount(() => {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyQ') {
                logoutForm.requestSubmit();
            }
        })
    })

</script>

<DropdownMenu.Root>   
    <DropdownMenu.Trigger class="{cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}">
        <span class="sr-only">Open profile settings</span>
        <Avatar.Root>
            <Avatar.Image src={user.avatarUrl} alt="" />
            <Avatar.Fallback>{user.name.slice(0, 2)}</Avatar.Fallback>
        </Avatar.Root>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="min-w-[14rem]">
        <DropdownMenu.Label>
            <span class="text-lg">{user.name}</span>
            <div class="text-muted-foreground flex items-center gap-1">
                {#if userProvider === 'google'}
                    <Google class="size-4" />
                {:else if userProvider === 'github'}
                    <GitHub class="size-4" />
                {/if}
                <span>{user.username}</span>
            </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
            <DropdownMenu.Item href={'/extension'}>Get extension</DropdownMenu.Item> 
            <DropdownMenu.Item on:click={() => commandMenuOpen.set(true)}>
                Command Menu
                <DropdownMenu.Shortcut>⌘K</DropdownMenu.Shortcut>
            </DropdownMenu.Item> 
            <!-- <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                    Appearence
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                    <DropdownMenu.Item on:click={() => setMode('light')}><Sun class="me-2 h-4 w-4" />Light</DropdownMenu.Item>
                    <DropdownMenu.Item on:click={() => setMode('dark')}><Moon class="me-2 h-4 w-4" />Dark</DropdownMenu.Item>
                    <DropdownMenu.Item on:click={() => resetMode()}><Monitor class="me-2 h-4 w-4" />System</DropdownMenu.Item>
                </DropdownMenu.SubContent>
            </DropdownMenu.Sub> -->
            <DropdownMenu.Separator />
            <form method="post" bind:this={logoutForm} class="w-full" action="/logout" use:enhance>
                <button type="submit" class="flex items-center w-full">
                    <DropdownMenu.Item class="w-full">
                        <LogOut class="me-2 h-4 w-4" />
                        Logout
                        <DropdownMenu.Shortcut>⇧⌘Q</DropdownMenu.Shortcut>
                    </DropdownMenu.Item>
                </button>
            </form>
        </DropdownMenu.Group>
    </DropdownMenu.Content>
</DropdownMenu.Root>


