import { typesIntoBox } from '@/lib/keys';
import type { HotkeyStore, Platform } from '@zag-js/hotkeys';
import { catalog, type ActionDef, type ActionId, type Scope } from './catalog';

/** What a page lends to an action: what to do, and when it can be done. */
export type Handler =
    | ((event?: KeyboardEvent) => void)
    | { run: (event?: KeyboardEvent) => void; enabled?: () => boolean };

type Lent = { run: (event?: KeyboardEvent) => void; enabled?: () => boolean };

type Hotkeys = typeof import('@zag-js/hotkeys');

/**
 * The actions of the app and the keys that trigger them. The catalog says what exists; pages lend behavior to the
 * actions that need their state (`provide`) and switch scopes on while they are on screen (`addScope`); the hotkey
 * store of @zag-js/hotkeys listens to the keyboard and calls `run`. An action is available when its scope is on,
 * its own condition holds and somebody can do it (a handler was lent, or the catalog says how).
 *
 * The library is loaded on its own, right after the page opens, so the first visit does not carry it; until it is
 * there nothing is bound and no keys can be drawn.
 */
class Actions {
    private readonly defs: readonly ActionDef[] = catalog;
    private readonly byId = new Map<string, ActionDef>(
        this.defs.map((action): [string, ActionDef] => [action.id, action]),
    );
    private readonly lent = new Map<string, Lent[]>();
    private readonly scopes = new Set<Scope>();
    private hotkeys: HotkeyStore | null = null;
    private library: Hotkeys | null = null;
    private loading: Promise<Hotkeys> | null = null;

    /** Loads the hotkey library, once. */
    load(): Promise<Hotkeys> {
        this.loading ??= import('@zag-js/hotkeys').then((library) => {
            this.library = library;

            return library;
        });

        return this.loading;
    }

    /** Whether the library is there, which is when keys can be drawn. */
    loaded(): boolean {
        return this.library !== null;
    }

    /** Every action, for the shortcut sheet and anything else that lists them. */
    list(): readonly ActionDef[] {
        return this.defs;
    }

    /** Lends behavior to an action for as long as the caller wants. The latest lender wins. Returns the way back. */
    provide(id: ActionId, handler: Handler): () => void {
        const entry: Lent =
            typeof handler === 'function' ? { run: handler } : handler;
        const stack = this.lent.get(id) ?? [];

        this.lent.set(id, [...stack, entry]);

        return () => {
            this.lent.set(
                id,
                (this.lent.get(id) ?? []).filter((other) => other !== entry),
            );
        };
    }

    private handlerOf(id: string): Lent | undefined {
        return this.lent.get(id)?.at(-1);
    }

    /** Whether the action can be done right now (not whether its scope is on: the hotkey store checks that). */
    available(id: ActionId): boolean {
        return this.canDo(id);
    }

    private canDo(id: string): boolean {
        const def = this.byId.get(id);

        if (def === undefined || def.when?.() === false) {
            return false;
        }

        const handler = this.handlerOf(id);

        if (handler !== undefined) {
            return handler.enabled?.() ?? true;
        }

        return def.run !== undefined;
    }

    /** Does the action, if it can be done. Menus and buttons call this, so they and the keys do the same thing. */
    run(id: ActionId, event?: KeyboardEvent): boolean {
        return this.doIt(id, event);
    }

    private doIt(id: string, event?: KeyboardEvent): boolean {
        if (!this.canDo(id)) {
            return false;
        }

        (this.handlerOf(id)?.run ?? this.byId.get(id)?.run)?.(event);

        return true;
    }

    addScope(scope: Scope): void {
        this.scopes.add(scope);
        this.hotkeys?.addScope(scope);
    }

    removeScope(scope: Scope): void {
        this.scopes.delete(scope);
        this.hotkeys?.removeScope(scope);
    }

    /** The scopes that are on. */
    activeScopes(): readonly string[] {
        return this.hotkeys?.getActiveScopes() ?? ['*', ...this.scopes];
    }

    /**
     * Starts listening to the keyboard and binds every action that has keys of its own. Several keys for one action
     * are several commands (the first keeps the id of the action). Returns the way to stop.
     */
    attach(target: Document | Element = document): () => void {
        let store: HotkeyStore | undefined;
        let stopped = false;

        void this.load().then((library) => {
            if (stopped) {
                return;
            }

            store = library.createHotkeyStore({
                // The same key may be bound in several scopes, and the library would warn about it.
                conflictBehavior: 'allow',
                activeScopes: ['*', ...this.scopes],
            });
            this.bind(store);
            store.init({ target });
            this.hotkeys = store;
        });

        return () => {
            stopped = true;
            store?.destroy();

            if (this.hotkeys === store) {
                this.hotkeys = null;
            }
        };
    }

    private bind(store: HotkeyStore): void {
        for (const def of this.defs) {
            if (def.local === true) {
                continue;
            }

            def.hotkeys.forEach((hotkey, index) => {
                // A bare letter (or a sequence that starts with one) stands aside while the letters are for the box.
                const letter = /^[a-z]$/i.test(
                    hotkey.split('>')[0]?.trim() ?? '',
                );

                store.register({
                    id: index === 0 ? def.id : `${def.id}#${index}`,
                    hotkey,
                    label: def.label,
                    category: def.category,
                    scopes: def.scopes ?? ['*'],
                    enabled: () =>
                        this.canDo(def.id) && !(letter && typesIntoBox()),
                    action: (event) => {
                        this.doIt(def.id, event);
                    },
                    ...(def.inFields === undefined
                        ? {}
                        : { options: { enableOnFormTags: def.inFields } }),
                });
            });
        }
    }

    /** The keys of an action, first the one that is shown where there is room for one. */
    hotkeysOf(id: ActionId): readonly string[] {
        return this.byId.get(id)?.hotkeys ?? [];
    }

    /** The platform the library binds for: what `mod` means. Windows until the library is loaded. */
    platform(): Platform {
        return this.library?.getPlatform() ?? 'windows';
    }

    /** One hotkey as the caps to draw for it: ["⌘", "K"] on a Mac, ["Ctrl", "K"] elsewhere, one cap per step of a sequence ("G", "H"). Empty until the library is loaded. */
    caps(hotkey: string): string[] {
        const library = this.library;

        if (library === null) {
            return [];
        }

        return hotkey
            .split('>')
            .flatMap((step) =>
                library
                    .formatHotkey(step.trim(), { style: 'mixed' })
                    .split(' '),
            );
    }
}

export const actions = new Actions();
