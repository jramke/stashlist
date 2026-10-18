import { isTextField } from '@/lib/keys';
import { play, soundEnabled, warm } from '@/lib/sound';
import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/** Everything a person presses with a pointer or a finger. */
const PRESSABLE =
    'button, a[href], summary, [role=button], [role=menuitem], [role=menuitemcheckbox], [role=option], [role=checkbox]';

/**
 * The sounds of the app, wired in one place: keys click while typing, buttons and links click when pressed, and
 * the server's notes and errors chime. Mounted once; it does nothing unless sounds are on.
 */
export function SoundEffects() {
    useEffect(() => {
        if (soundEnabled()) {
            warm();
        }

        function keyDown(event: KeyboardEvent) {
            if (
                event.repeat ||
                event.isComposing ||
                event.key === 'Unidentified'
            ) {
                return;
            }

            if (isTextField(event.target)) {
                const modified = event.ctrlKey || event.metaKey || event.altKey;

                if (event.key === 'Enter') {
                    play('enter');
                } else if (modified) {
                    return;
                } else if (event.key === ' ') {
                    play('space');
                } else if (
                    event.key === 'Backspace' ||
                    event.key === 'Delete'
                ) {
                    play('back');
                } else if (event.key.length === 1) {
                    play('key');
                }

                return;
            }

            // Enter or Space on a focused button or link is a press too.
            if (
                (event.key === 'Enter' || event.key === ' ') &&
                !(event.ctrlKey || event.metaKey || event.altKey) &&
                event.target instanceof Element &&
                event.target.closest(PRESSABLE) !== null
            ) {
                play('click');
            }
        }

        function keyUp(event: KeyboardEvent) {
            if (
                isTextField(event.target) &&
                (event.key.length === 1 ||
                    event.key === 'Backspace' ||
                    event.key === 'Enter') &&
                !(event.ctrlKey || event.metaKey || event.altKey)
            ) {
                play('release');
            }
        }

        function pointerDown(event: PointerEvent) {
            const pressed =
                event.button === 0 && event.target instanceof Element
                    ? event.target.closest(PRESSABLE)
                    : null;

            if (
                pressed !== null &&
                !pressed.matches(':disabled, [aria-disabled=true]')
            ) {
                play('click');
            }
        }

        document.addEventListener('keydown', keyDown, true);
        document.addEventListener('keyup', keyUp, true);
        document.addEventListener('pointerdown', pointerDown, true);

        const offFlash = router.on('flash', ({ detail }) => {
            const note = detail.flash.toast;

            if (note) {
                play(
                    note.type === 'error'
                        ? 'error'
                        : note.type === 'success'
                          ? 'success'
                          : 'pop',
                );
            }
        });
        // A form the server refused.
        const offError = router.on('error', () => play('error'));

        return () => {
            document.removeEventListener('keydown', keyDown, true);
            document.removeEventListener('keyup', keyUp, true);
            document.removeEventListener('pointerdown', pointerDown, true);
            offFlash();
            offError();
        };
    }, []);

    return null;
}
