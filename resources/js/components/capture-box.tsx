import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store } from '@/routes/stashes';
import { Form } from '@inertiajs/react';
import { ImagePlus } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

/**
 * The one place to save things: paste a link, a color or a note, or drop an image on it. The server decides
 * what the input is.
 */
export function CaptureBox() {
    const picker = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    function drop(event: DragEvent<HTMLFormElement>) {
        event.preventDefault();
        setDragging(false);

        const files = event.dataTransfer.files;

        if (files.length > 0 && picker.current !== null) {
            picker.current.files = files;
            event.currentTarget.requestSubmit();
        }
    }

    return (
        <Form
            {...store.form()}
            resetOnSuccess
            options={{ preserveScroll: true }}
            encType="multipart/form-data"
            onDragOver={(event: DragEvent<HTMLFormElement>) => {
                event.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
            className={cn(
                'grid gap-2 rounded-xl border border-dashed p-3 transition-colors',
                dragging && 'border-foreground bg-muted',
            )}
        >
            {({ processing, errors }) => (
                <>
                    <div className="flex gap-2">
                        <Input
                            name="input"
                            aria-label="Paste a link, a color or a note"
                            placeholder="Paste a link, a color or a note, or drop an image"
                            autoComplete="off"
                            className="h-9"
                        />
                        <input
                            ref={picker}
                            type="file"
                            name="image"
                            accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif"
                            className="hidden"
                            onChange={(event) => {
                                if (event.currentTarget.files?.length) {
                                    event.currentTarget.form?.requestSubmit();
                                }
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-lg"
                            aria-label="Add an image"
                            onClick={() => picker.current?.click()}
                        >
                            <ImagePlus />
                        </Button>
                        <Button type="submit" size="lg" disabled={processing}>
                            {processing && <Spinner />}
                            Stash
                        </Button>
                    </div>

                    <InputError message={errors.input ?? errors.image} />
                </>
            )}
        </Form>
    );
}
