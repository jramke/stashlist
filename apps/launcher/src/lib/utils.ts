export function memoize(func: (...args: any[]) => any) {
    const cache = new Map();
    return function (...args: any[]) {
        const key = JSON.stringify(args);
        if (!cache.has(key)) {
            cache.set(key, func(...args));
        }
        return cache.get(key);
    };
}