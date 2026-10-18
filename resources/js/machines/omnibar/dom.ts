import type { Scope } from '@zag-js/core';

/** The elements of the box, found by ids made from the machine's id. */
export const dom = {
    getInputId: (scope: Scope) => `omnibar:${scope.id}:input`,
    getListId: (scope: Scope) => `omnibar:${scope.id}:list`,
    getRowId: (scope: Scope, index: number) =>
        `omnibar:${scope.id}:row:${index}`,
    getPickerId: (scope: Scope) => `omnibar:${scope.id}:picker`,
    getInputEl: (scope: Scope) =>
        scope.getById<HTMLTextAreaElement>(dom.getInputId(scope)),
    getPickerEl: (scope: Scope) =>
        scope.getById<HTMLInputElement>(dom.getPickerId(scope)),
};
