import { createAnatomy } from '@zag-js/anatomy';

/** The parts of the box. Each one gets an attribute like `data-omnibar-chip-remove="<machine id>"`. */
export const anatomy = createAnatomy('omnibar').parts(
    'root',
    'field',
    'leading',
    'chip',
    'chipRemove',
    'input',
    'slot',
    'action',
    'drop',
    'popup',
    'list',
    'row',
    'hint',
    'picker',
);

export const parts = anatomy.build();
