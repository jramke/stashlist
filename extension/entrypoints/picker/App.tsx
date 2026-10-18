import { Button, Note } from '@/components/ui';
import { explain, stashThing } from '@/lib/stash-tab';
import { useState } from 'react';

// Chrome has an eyedropper that can read any pixel on the screen; Firefox does not, and falls back to the
// color field (which has an eyedropper of its own in most systems).
type EyeDropperApi = { open: () => Promise<{ sRGBHex: string }> };
declare const EyeDropper: (new () => EyeDropperApi) | undefined;

/** A small window to pick a color from the screen and stash it. It is a page of its own because the eyedropper needs a click inside it. */
export function App() {
    const [color, setColor] = useState('#e63946');
    const [status, setStatus] = useState<{
        tone: 'muted' | 'error';
        text: string;
    } | null>(null);
    const hasEyeDropper = typeof EyeDropper !== 'undefined';

    async function pick(): Promise<void> {
        try {
            if (typeof EyeDropper !== 'undefined') {
                setColor((await new EyeDropper().open()).sRGBHex);
            }
        } catch {
            // Cancelled with Escape.
        }
    }

    async function stash(): Promise<void> {
        setStatus({ tone: 'muted', text: 'Stashing…' });

        try {
            const result = await stashThing({ type: 'color', body: color });
            setStatus({
                tone: 'muted',
                text: result.created ? 'Stashed.' : 'Already stashed.',
            });
            setTimeout(() => window.close(), 1200);
        } catch (error) {
            setStatus({ tone: 'error', text: explain(error) });
        }
    }

    return (
        <main className="grid gap-4 p-5">
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    aria-label="Color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="size-14 rounded-lg border border-input bg-transparent p-0"
                />
                <code className="text-sm">{color}</code>
            </div>

            <div className="flex gap-2">
                {hasEyeDropper && (
                    <Button variant="outline" onClick={() => void pick()}>
                        Pick from screen
                    </Button>
                )}
                <Button onClick={() => void stash()}>Stash color</Button>
            </div>

            {status !== null && <Note tone={status.tone}>{status.text}</Note>}
        </main>
    );
}
