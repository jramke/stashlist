import { useEffect, useRef, useState } from 'react';
import { actions, type Handler } from './actions';
import type { ActionId, Scope } from './catalog';

/**
 * Lends behavior to an action while the component is mounted. The handler may change on every render; the
 * action always calls the latest one, so nothing has to be wrapped in a ref by the caller.
 */
export function useAction(id: ActionId, handler: Handler): void {
    const latest = useRef(handler);

    useEffect(() => {
        latest.current = handler;
    });

    useEffect(
        () =>
            actions.provide(id, {
                run: (event) => {
                    const current = latest.current;

                    (typeof current === 'function' ? current : current.run)(
                        event,
                    );
                },
                enabled: () => {
                    const current = latest.current;

                    return typeof current === 'function'
                        ? true
                        : (current.enabled?.() ?? true);
                },
            }),
        [id],
    );
}

/** Switches a scope on while the component is mounted (and `active` holds). */
export function useScope(scope: Scope, active = true): void {
    useEffect(() => {
        if (!active) {
            return;
        }

        actions.addScope(scope);

        return () => actions.removeScope(scope);
    }, [scope, active]);
}

/** True once the hotkey library is loaded, which is when keys can be drawn (nothing is drawn before, on the server too). */
export function useKeysReady(): boolean {
    const [ready, setReady] = useState(actions.loaded());

    useEffect(() => {
        let mounted = true;

        void actions.load().then(() => {
            if (mounted) {
                setReady(true);
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

    return ready;
}
