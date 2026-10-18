import type { Scope } from '@zag-js/core';

/** The elements of a card the machine looks at, found by ids made from the machine's id. */
export const dom = {
    getImageId: (scope: Scope) => `stash-card:${scope.id}:image`,
    getImageEl: (scope: Scope) =>
        scope.getById<HTMLImageElement>(dom.getImageId(scope)),
};
