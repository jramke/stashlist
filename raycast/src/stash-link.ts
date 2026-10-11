import {
    Clipboard,
    LaunchProps,
    showHUD,
    showToast,
    Toast,
} from '@raycast/api';
import { saveLink } from './api';

/** The link of the argument, or the one on the clipboard. */
export default async function Command(
    props: LaunchProps<{ arguments: Arguments.StashLink }>,
) {
    const typed = props.arguments.link?.trim() ?? '';
    const link =
        typed !== '' ? typed : ((await Clipboard.readText()) ?? '').trim();

    if (!/^https?:\/\/\S+$/i.test(link)) {
        await showToast({
            style: Toast.Style.Failure,
            title: 'No link to stash',
            message: 'Type a link, or copy one first.',
        });

        return;
    }

    try {
        const { created, stash } = await saveLink(link);

        await showHUD(
            created
                ? `Stashed: ${stash.title}`
                : `Already stashed: ${stash.title}`,
        );
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: 'Could not stash',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
