// import { randomBytes } from 'node:crypto';

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

// function generateRandomString(length: number): string {
//     const bytes = randomBytes(Math.ceil(length / 2));
//     return bytes.toString('hex').slice(0, length);
// }

//TODO make crypto import working, dont know why because the function is only used serverside
export function generateUniqueID(): string {
    const timestamp = Date.now().toString(36);
    // const randomString = generateRandomString(10);
    const randomString = Math.random().toString(36).substring(2, 15);
    const uniqueID = timestamp + randomString;
    return uniqueID;
}