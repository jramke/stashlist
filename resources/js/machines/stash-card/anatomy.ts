import { createAnatomy } from '@zag-js/anatomy';

/** The parts of a stash card. Each one carries `data-scope="stash-card"` and its own `data-part`. */
export const anatomy = createAnatomy('stash-card').parts(
    'root',
    'surface',
    'media',
    'image',
    'overlay',
    'text',
    'tile',
    'swatch',
    'file',
    'title',
    'indicator',
    'statuses',
    'status',
);

export const parts = anatomy.build();
