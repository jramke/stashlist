import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';
const listeners = new Set<() => void>();

// Keeps the choice alive for this page view when localStorage is blocked.
let memory: Theme | null = null;

function readTheme(): Theme {
    if (memory) {
        return memory;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
        return 'system';
    }
}

function applyTheme(theme: Theme): void {
    const dark =
        theme === 'dark' ||
        (theme === 'system' &&
            matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
    memory = theme;

    try {
        if (theme === 'system') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, theme);
        }
    } catch {
        // storage blocked: the choice still applies until reload
    }

    applyTheme(theme);
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onExternalChange = () => {
        memory = null;
        applyTheme(readTheme());
        listener();
    };

    listeners.add(listener);
    media.addEventListener('change', onExternalChange);
    window.addEventListener('storage', onExternalChange);

    return () => {
        listeners.delete(listener);
        media.removeEventListener('change', onExternalChange);
        window.removeEventListener('storage', onExternalChange);
    };
}

export function useTheme(): [Theme, typeof setTheme] {
    const theme = useSyncExternalStore<Theme>(
        subscribe,
        readTheme,
        () => 'system',
    );

    return [theme, setTheme];
}
