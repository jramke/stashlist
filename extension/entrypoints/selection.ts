import { describeSelection } from '@/lib/highlights/selection';

// Injected on demand like capture.ts: the passage is read when the person asks for a highlight.
export default defineUnlistedScript(() => ({
    url: location.href,
    title: document.title,
    outcome: describeSelection(document, getSelection()),
}));
