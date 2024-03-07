export function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

export function getEnviroment(): 'development' | 'production' {
    try {
        const mode = import.meta.env.MODE;      
        if (mode === 'development' || mode === 'test') {
            return 'development';
        }
    } catch (e) {
        // do nothing, this is okay
    }
    return 'production';
}

export const consolePrefix = '[Svelte Analytics]';