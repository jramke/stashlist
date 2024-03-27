<script lang="ts">
    import { Button } from '@repo/ui/components/button';
    import { LogOut, ChevronsUpDown,Sun, Moon, Monitor, GitHub } from '@repo/ui/icons';
    import { enhance } from '$app/forms';
	import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
    import { page } from '$app/stores';
	import * as Avatar from '@repo/ui/components/avatar';
	import { onMount } from 'svelte';
    import { setMode, resetMode } from 'mode-watcher';
	import { siteConfig } from '$lib/config/site';
    
    let logoutForm: HTMLFormElement;
    
    $: user = $page.data.user;
    
    onMount(() => {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyQ') {
                logoutForm.requestSubmit();
            }
        })
    })

</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger>
        <span class="sr-only">Open profile settings</span>
        <Avatar.Root>
            <Avatar.Image src={user.avatarUrl} alt="" />
            <Avatar.Fallback>{user.name.slice(0, 2)}</Avatar.Fallback>
        </Avatar.Root>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="min-w-[200px]" align="end">
        <DropdownMenu.Label>
            <span class="text-lg">{user.name}</span>
            <div class="text-muted-foreground flex items-center gap-1">
                <!-- TODO: use real login provider icon -->
                <GitHub class="size-3" /> 
                <span>{user.username}</span>
            </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
            <DropdownMenu.Item href={'/extension'}>Get extension</DropdownMenu.Item> 
            <DropdownMenu.Item>Connect to VS Code</DropdownMenu.Item> 
            <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                    Appearence
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                    <DropdownMenu.Item on:click={() => setMode('light')}><Sun class="me-2 h-4 w-4" />Light</DropdownMenu.Item>
                    <DropdownMenu.Item on:click={() => setMode('dark')}><Moon class="me-2 h-4 w-4" />Dark</DropdownMenu.Item>
                    <DropdownMenu.Item on:click={() => resetMode()}><Monitor class="me-2 h-4 w-4" />System</DropdownMenu.Item>
                </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
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

