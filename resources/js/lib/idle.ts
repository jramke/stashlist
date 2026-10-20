/**
 * Runs `task` when the browser has nothing better to do: after the page, and not in the way of it. Safari has no
 * idle callbacks, so there it is a moment later. Returns the way to cancel.
 */
export function whenIdle(task: () => void): () => void {
    if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(task, { timeout: 2000 });

        return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(task, 300);

    return () => window.clearTimeout(id);
}
