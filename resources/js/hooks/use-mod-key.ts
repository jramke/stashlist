import { actions } from '@/commands/actions';
import { useKeysReady } from '@/commands/hooks';

/** The name of the main modifier key as the hotkey library sees this machine (what `mod` means), for the hints in the box. */
export function useModKey(): string {
    useKeysReady();

    return actions.platform() === 'mac' ? '⌘' : 'Ctrl';
}
