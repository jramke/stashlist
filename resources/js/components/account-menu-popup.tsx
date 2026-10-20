import type { ActionId } from '@/commands/catalog';
import {
    accountButtonClass,
    type AccountMenuPopupProps,
} from '@/components/account-menu';
import { Keys } from '@/components/keys';
import { setSoundEnabled, useSoundEnabled } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { logout, privacy, shortcuts } from '@/routes';
import { index as collections } from '@/routes/collections';
import { edit as profile } from '@/routes/profile';
import { index as tags } from '@/routes/tags';
import { Menu } from '@base-ui/react/menu';
import { Link, router } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** The menu behind the initial of the person: Base UI's menu, with the places that are not the feed. */
export function AccountMenuPopup({
    name,
    className,
    defaultOpen,
}: AccountMenuPopupProps) {
    const sounds = useSoundEnabled();

    return (
        <Menu.Root defaultOpen={defaultOpen}>
            <Menu.Trigger
                aria-label="Menu"
                className={cn(accountButtonClass, className)}
            >
                {name.slice(0, 1) || '·'}
            </Menu.Trigger>

            <Menu.Portal>
                <Menu.Positioner align="end" sideOffset={8} className="z-50">
                    <Menu.Popup className="pop w-52 origin-(--transform-origin) animate-panel-in">
                        <Menu.Group>
                            <Menu.GroupLabel className="pop-label">
                                {name}
                            </Menu.GroupLabel>
                        </Menu.Group>
                        <Entry href={collections().url} action="go.collections">
                            Collections
                        </Entry>
                        <Entry href={tags().url} action="go.tags">
                            Tags
                        </Entry>
                        <Entry href={profile().url} action="go.settings">
                            Settings
                        </Entry>
                        <Entry href={shortcuts().url}>Shortcuts</Entry>
                        <Entry href={privacy().url}>Privacy</Entry>

                        <Menu.CheckboxItem
                            checked={sounds}
                            onCheckedChange={setSoundEnabled}
                            className="pop-item"
                        >
                            Sounds
                            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                                {sounds ? 'On' : 'Off'}
                                <Keys action="sound.toggle" />
                            </span>
                        </Menu.CheckboxItem>

                        <Menu.Separator className="pop-sep" />

                        <Menu.Item
                            onClick={() => router.post(logout().url)}
                            className="pop-item text-muted-foreground data-[highlighted]:text-foreground"
                        >
                            Log out
                        </Menu.Item>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}

/** A place to go: a link in the menu that closes it, with the keys that go there on its right. */
function Entry({
    href,
    action,
    children,
}: {
    href: string;
    action?: ActionId;
    children: ReactNode;
}) {
    return (
        <Menu.LinkItem
            closeOnClick
            render={<Link href={href} />}
            className="pop-item"
        >
            {children}
            {action !== undefined && (
                <span className="ml-auto">
                    <Keys action={action} />
                </span>
            )}
        </Menu.LinkItem>
    );
}
