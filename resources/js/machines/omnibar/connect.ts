import { dataAttr } from '@zag-js/dom-query';
import type { NormalizeProps, PropTypes } from '@zag-js/types';
import { parts } from './anatomy';
import { dom } from './dom';
import { IMAGE_TYPES, leadingOf, stashLabelOf } from './grammar';
import { listOf } from './machine';
import type { OmnibarApi, OmnibarService, Slot } from './types';

/**
 * Maps the state of the box to the props of its parts. The keyboard is read here, where the default of a key
 * can still be stopped: the keys the box owns become events, and the rest is left to the field.
 */
export function connect<T extends PropTypes>(
    service: OmnibarService,
    normalize: NormalizeProps<T>,
): OmnibarApi<T> {
    const { state, context, computed, prop, send, scope } = service;

    const text = context.get('text');
    const highlight = context.get('highlight');
    const error = context.get('error');
    const dragging = context.get('dragging');
    const kind = computed('kind');
    const chips = computed('chips');
    const { rows, suggesting } = listOf(service);
    const visible = rows.length > 0;
    const note = prop('note');
    const stashing = state.matches('stashing');

    const slot: Slot = stashing
        ? 'stashing'
        : error !== null
          ? 'error'
          : note !== null
            ? 'note'
            : kind !== 'empty'
              ? 'action'
              : 'none';

    return {
        state: stashing ? 'stashing' : state.matches('open') ? 'open' : 'idle',
        text,
        kind,
        dragging,
        error,
        slot,
        leading: leadingOf(kind, text),
        placeholder:
            chips.length > 0
                ? 'Search these'
                : 'Search, or paste anything to stash',
        stashLabel: stashLabelOf(kind),
        chips,
        rows,
        suggesting,
        visible,
        highlight,

        stashText() {
            send({ type: 'STASH.TEXT' });
        },
        removeChip(chip) {
            send({ type: 'CHIP.REMOVE', key: chip.key });
        },

        getRootProps() {
            return normalize.element({
                ...parts.root.attrs(scope.id),
                // How the rest of the app finds the box.
                'data-omnibar': '',
                'data-state': stashing
                    ? 'stashing'
                    : state.matches('open')
                      ? 'open'
                      : 'idle',
                'data-dragging': dataAttr(dragging),
                onBlur(event) {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        send({ type: 'FOCUS.OUT' });
                    }
                },
                onPointerDown() {
                    send({ type: 'POINTER.DOWN' });
                },
            });
        },
        getFieldProps() {
            return normalize.element({
                ...parts.field.attrs(scope.id),
                'data-dragging': dataAttr(dragging),
            });
        },
        getLeadingProps() {
            return normalize.element({
                ...parts.leading.attrs(scope.id),
                'data-kind': kind,
            });
        },
        getChipProps(chip) {
            return normalize.element({
                ...parts.chip.attrs(scope.id),
                'data-chip': chip.key,
            });
        },
        getChipRemoveProps(chip) {
            return normalize.button({
                ...parts.chipRemove.attrs(scope.id),
                type: 'button',
                tabIndex: -1,
                'aria-label': `Remove ${chip.label}`,
                onClick() {
                    send({ type: 'CHIP.REMOVE', key: chip.key });
                },
            });
        },
        getInputProps() {
            return normalize.textarea({
                ...parts.input.attrs(scope.id),
                id: dom.getInputId(scope),
                'data-omnibar-input': '',
                role: 'combobox',
                'aria-label':
                    'Search your stashes, or stash a link, a note, a color or an image',
                'aria-expanded': visible,
                'aria-controls': dom.getListId(scope),
                'aria-activedescendant':
                    visible && highlight >= 0
                        ? dom.getRowId(scope, highlight)
                        : undefined,
                'aria-autocomplete': 'list',
                'aria-busy': stashing || undefined,
                rows: 1,
                // The field keeps its own text (the cursor stays where it is); the machine follows it and
                // writes to it only when the text changes for another reason than typing.
                defaultValue: context.initial('text'),
                placeholder:
                    chips.length > 0
                        ? 'Search these'
                        : 'Search, or paste anything to stash',
                autoComplete: 'off',
                autoCorrect: 'off',
                spellCheck: false,
                onChange(event) {
                    send({
                        type: 'INPUT.CHANGE',
                        value: event.currentTarget.value,
                    });
                },
                onKeyDown(event) {
                    if (event.defaultPrevented) {
                        return;
                    }

                    const field = event.currentTarget;

                    if (event.key === 'Enter') {
                        if (event.shiftKey || event.nativeEvent.isComposing) {
                            return;
                        }

                        event.preventDefault();
                        send({
                            type: 'INPUT.ENTER',
                            modifier: event.metaKey || event.ctrlKey,
                        });
                    } else if (event.key === 'ArrowDown') {
                        if (visible) {
                            event.preventDefault();
                            send({ type: 'LIST.NEXT' });
                        } else if (!field.value.includes('\n')) {
                            event.preventDefault();
                            send({ type: 'INPUT.LEAVE' });
                        }
                    } else if (
                        event.key === 'ArrowUp' &&
                        visible &&
                        highlight >= 0
                    ) {
                        event.preventDefault();
                        send({ type: 'LIST.PREVIOUS' });
                    } else if (
                        event.key === 'Tab' &&
                        !event.shiftKey &&
                        suggesting
                    ) {
                        event.preventDefault();
                        send({ type: 'LIST.ACCEPT' });
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        send({ type: 'INPUT.ESCAPE' });
                    } else if (
                        event.key === 'Backspace' &&
                        field.selectionStart === 0 &&
                        field.selectionEnd === 0 &&
                        chips.length > 0
                    ) {
                        event.preventDefault();
                        send({ type: 'CHIP.POP' });
                    }
                },
                onPaste(event) {
                    const files = Array.from(event.clipboardData.files);

                    if (files.some((file) => file.type.startsWith('image/'))) {
                        event.preventDefault();
                        send({ type: 'FILES.STASH', files });
                    }
                },
            });
        },
        getSlotProps() {
            return normalize.element({
                ...parts.slot.attrs(scope.id),
                'data-slot': slot,
            });
        },
        getActionProps() {
            return normalize.button({
                ...parts.action.attrs(scope.id),
                type: 'button',
                'data-kind': kind,
                onClick() {
                    send({ type: 'STASH.TEXT' });
                },
            });
        },
        getDropProps() {
            return normalize.element({
                ...parts.drop.attrs(scope.id),
                'aria-hidden': true,
            });
        },
        getPopupProps() {
            return normalize.element({
                ...parts.popup.attrs(scope.id),
                'data-kind': suggesting ? 'suggestions' : 'menu',
            });
        },
        getListProps() {
            return normalize.element({
                ...parts.list.attrs(scope.id),
                id: dom.getListId(scope),
                role: 'listbox',
            });
        },
        getRowProps(row, index) {
            return normalize.element({
                ...parts.row.attrs(scope.id),
                id: dom.getRowId(scope, index),
                role: 'option',
                'aria-selected': index === highlight,
                'data-highlighted': dataAttr(index === highlight),
                'data-kind': row.kind,
                onMouseEnter() {
                    send({ type: 'ROW.HOVER', index });
                },
                // Keep the focus in the box: a click on a row must not blur it first.
                onMouseDown(event) {
                    event.preventDefault();
                },
                onClick() {
                    send({ type: 'ROW.CLICK', index });
                },
            });
        },
        getHintProps() {
            return normalize.element({ ...parts.hint.attrs(scope.id) });
        },
        getPickerProps() {
            return normalize.input({
                ...parts.picker.attrs(scope.id),
                id: dom.getPickerId(scope),
                type: 'file',
                accept: IMAGE_TYPES,
                tabIndex: -1,
                onChange(event) {
                    const files = Array.from(event.currentTarget.files ?? []);

                    event.currentTarget.value = '';
                    send({ type: 'FILES.STASH', files });
                },
            });
        },
    };
}
