import HighlightController from '@/actions/App/Http/Controllers/HighlightController';
import { ConfirmButton } from '@/components/confirm-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, router } from '@inertiajs/react';
import { ExternalLink, Trash2 } from 'lucide-react';

/** The passages marked on a page: the text, a note of your own, a link that opens the page at the passage. */
export function HighlightList({
    highlights,
}: {
    highlights: App.Data.HighlightData[];
}) {
    return (
        <ul className="grid gap-4">
            {highlights.map((highlight) => (
                <li key={highlight.id} className="grid gap-2">
                    <blockquote className="border-l-2 border-foreground/30 pl-3 text-sm whitespace-pre-wrap">
                        {highlight.text}
                    </blockquote>

                    <Form
                        {...HighlightController.update.form.patch(highlight.id)}
                        options={{ preserveScroll: true }}
                        className="flex gap-2"
                    >
                        <Input
                            name="note"
                            aria-label="Note on this highlight"
                            placeholder="Add a note"
                            defaultValue={highlight.note ?? ''}
                            maxLength={1000}
                        />
                        <Button type="submit" variant="outline" size="sm">
                            Save
                        </Button>
                    </Form>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {highlight.page_link !== null && (
                            <a
                                href={highlight.page_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-foreground"
                            >
                                <ExternalLink className="size-3.5" />
                                Open on the page
                            </a>
                        )}
                        <ConfirmButton
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            aria-label="Delete this highlight"
                            onConfirm={() =>
                                router.delete(
                                    HighlightController.destroy.url(
                                        highlight.id,
                                    ),
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <Trash2 />
                            Delete
                        </ConfirmButton>
                    </div>
                </li>
            ))}
        </ul>
    );
}
