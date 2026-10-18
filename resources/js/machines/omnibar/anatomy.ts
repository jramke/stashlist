import { createAnatomy } from '@zag-js/anatomy';

/** The parts of the box. Each one carries `data-scope="omnibar"` and its own `data-part`. */
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
