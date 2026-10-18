import { useEffect, useState } from 'react';

/** The name of the main modifier key on this machine, for the shortcut hints. Ctrl until the browser has said otherwise. */
export function useModKey(): string {
    const [mod, setMod] = useState('Ctrl');

    useEffect(() => {
        if (/Mac|iPhone|iPad/.test(navigator.platform)) {
            setMod('⌘');
        }
    }, []);

    return mod;
}
