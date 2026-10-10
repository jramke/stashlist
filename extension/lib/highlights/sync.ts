import type { Client } from '../api';
import { loadMeta, putHighlight, removeHighlight, saveMeta } from './store';

/** The most highlights asked for in one request (the API takes 200). */
const BATCH = 200;

/**
 * Brings the local copy up to date with the server in as few requests as the change needs: one list of ids and
 * revisions (a 304 when nothing changed), then only the highlights that are new or edited, and a highlight the
 * list no longer has was deleted.
 *
 * @returns whether anything changed
 */
export async function syncHighlights(client: Client): Promise<boolean> {
    const meta = await loadMeta();
    const answer = await client.highlightIndex(meta.etag);

    if (!answer.changed) {
        return false;
    }

    const listed = new Set(answer.list.map((entry) => String(entry.id)));
    const wanted = answer.list
        .filter((entry) => meta.entries[entry.id]?.v !== entry.v)
        .map((entry) => entry.id);
    const gone = Object.keys(meta.entries).filter((id) => !listed.has(id));

    for (let from = 0; from < wanted.length; from += BATCH) {
        for (const highlight of await client.highlights(
            wanted.slice(from, from + BATCH),
        )) {
            await putHighlight(highlight, meta);
        }
    }

    for (const id of gone) {
        await removeHighlight(Number(id), meta);
    }

    meta.etag = answer.etag;
    await saveMeta(meta);

    return wanted.length > 0 || gone.length > 0;
}
