import { useSyncExternalStore } from 'react';

/**
 * Whether the app makes sounds, and the one way to ask for one. The sounds themselves are made by
 * `sound-engine.ts`, which is loaded on its own so the first visit does not pay for it.
 */
export type Sound =
    | 'key'
    | 'space'
    | 'enter'
    | 'back'
    | 'release'
    | 'click'
    | 'tick'
    | 'pop'
    | 'success'
    | 'error';

const STORAGE_KEY = 'sound';
const listeners = new Set<() => void>();

// What is known about the choice: null until it has been read, and again after something outside changed it.
let cached: boolean | null = null;

function read(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored === 'on' || stored === 'off') {
            return stored === 'on';
        }
    } catch {
        // storage blocked: the default applies
    }

    // Without a choice of its own the app stays quiet for people who asked their system for less motion.
    return !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function soundEnabled(): boolean {
    cached ??= read();

    return cached;
}

export function setSoundEnabled(on: boolean): void {
    cached = on;

    try {
        localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
        // storage blocked: the choice still applies until reload
    }

    listeners.forEach((listener) => listener());

    if (on) {
        warm();
        play('pop');
    }
}

function subscribe(listener: () => void): () => void {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const outside = () => {
        cached = null;
        listener();
    };

    listeners.add(listener);
    media.addEventListener('change', outside);
    window.addEventListener('storage', outside);

    return () => {
        listeners.delete(listener);
        media.removeEventListener('change', outside);
        window.removeEventListener('storage', outside);
    };
}

export function useSoundEnabled(): boolean {
    return useSyncExternalStore(subscribe, soundEnabled, () => false);
}

let engine: typeof import('./sound-engine') | null = null;
let loading: Promise<void> | null = null;

/**
 * Loads the synthesizer ahead of the first key. The audio context has to be started inside a key or a click, and
 * the browser forgets that a moment after an `import()`, so the code must be there before the person types.
 */
export function warm(): void {
    loading ??= import('./sound-engine').then((module) => {
        engine = module;
    });
}

/** Plays a sound if the person wants sounds. Cheap to call when they do not. */
export function play(sound: Sound): void {
    if (!soundEnabled() || document.hidden) {
        return;
    }

    if (engine === null) {
        warm();

        return;
    }

    engine.ring(sound);
}
