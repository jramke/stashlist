import { dataAttr } from '@zag-js/dom-query';
import type { NormalizeProps, PropTypes } from '@zag-js/types';
import { parts } from './anatomy';
import { dom } from './dom';
import { describe } from './face';
import type { CardStatus, StashCardApi, StashCardService } from './types';

/**
 * Maps the state of a card to the props of its parts. The root is meant to be merged into the element of a
 * listbox item (or a link): it carries data attributes for CSS, an accessible description and no handlers of
 * its own, so it never fights what the list does with clicks and keys.
 */
export function connect<T extends PropTypes>(
    service: StashCardService,
    normalize: NormalizeProps<T>,
): StashCardApi<T> {
    const { state, context, prop, computed, send, scope } = service;

    const stash = prop('stash');
    const phase = state.get();
    const media = context.get('media');
    const arrived = context.get('arrived');
    const busy = computed('busy');
    const face = computed('face');
    const peek = !!prop('peek');
    const highlighted = !!prop('highlighted');

    return {
        phase,
        busy,
        arrived,
        media,
        face,
        title: computed('title'),
        indicator: computed('indicator'),
        statuses: computed('statuses'),
        price: computed('price'),

        getRootProps() {
            return normalize.element({
                ...parts.root.attrs(scope.id),
                'data-card': '',
                'data-stash': stash.id,
                'data-type': stash.type,
                'data-subtype': stash.subtype ?? undefined,
                'data-phase': phase,
                'data-media': media,
                'data-face': face.kind,
                'data-busy': dataAttr(busy),
                'data-arrived': dataAttr(arrived),
                'data-fresh': dataAttr(!!prop('fresh')),
                // What the keyboard (the list) or the playground wants shown as if the pointer were on it.
                'data-peek': dataAttr(peek || highlighted),
                'aria-busy': busy || undefined,
                'aria-label': describe(stash, phase),
            });
        },
        getSurfaceProps() {
            return normalize.element({ ...parts.surface.attrs(scope.id) });
        },
        getMediaProps() {
            return normalize.element({
                ...parts.media.attrs(scope.id),
                'data-face': face.kind,
                'data-media': media,
            });
        },
        getImageProps() {
            return normalize.img({
                ...parts.image.attrs(scope.id),
                id: dom.getImageId(scope),
                alt: '',
                'data-media': media,
                decoding: 'async',
                onLoad() {
                    send({ type: 'MEDIA.LOAD' });
                },
                onError() {
                    send({ type: 'MEDIA.ERROR' });
                },
            });
        },
        getOverlayProps() {
            return normalize.element({
                ...parts.overlay.attrs(scope.id),
                'aria-hidden': true,
            });
        },
        getTextProps() {
            return normalize.element({
                ...parts.text.attrs(scope.id),
                'data-quote': dataAttr(face.kind === 'note' && face.quote),
            });
        },
        getTileProps() {
            return normalize.element({
                ...parts.tile.attrs(scope.id),
                'aria-hidden': true,
                'data-skeleton': dataAttr(busy),
            });
        },
        getSwatchProps() {
            return normalize.element({
                ...parts.swatch.attrs(scope.id),
                'aria-hidden': true,
            });
        },
        getFileProps() {
            return normalize.element({
                ...parts.file.attrs(scope.id),
                'aria-hidden': true,
            });
        },
        getTitleProps() {
            return normalize.element({
                ...parts.title.attrs(scope.id),
                'data-empty': dataAttr(computed('title') === null),
            });
        },
        getIndicatorProps() {
            const indicator = computed('indicator');

            return normalize.element({
                ...parts.indicator.attrs(scope.id),
                'data-glyph': indicator.glyph,
                title: indicator.label,
            });
        },
        getPriceProps() {
            return normalize.element({
                ...parts.price.attrs(scope.id),
                'data-price': computed('price') ?? undefined,
            });
        },
        getStatusesProps() {
            return normalize.element({
                ...parts.statuses.attrs(scope.id),
                'data-count': computed('statuses').length,
            });
        },
        getStatusProps(status: CardStatus) {
            return normalize.element({
                ...parts.status.attrs(scope.id),
                'data-kind': status.kind,
                title: status.detail ?? status.label,
            });
        },
    };
}
