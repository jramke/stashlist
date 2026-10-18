import { createAnatomy } from '@zag-js/anatomy';

/** The parts of a stash card. Each one gets an attribute like `data-stash-card-media="<machine id>"`. */
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
    'price',
    'statuses',
    'status',
);

export const parts = anatomy.build();
