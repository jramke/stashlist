import { extractPage } from '@/lib/extract';

// Injected on demand (activeTab + scripting) and never listed in the manifest as a content script: the page is
// read when the person clicks, presses the shortcut or uses the menu, and not before. The value this returns
// is what scripting.executeScript hands back.
export default defineUnlistedScript(() => extractPage(document, location.href));
