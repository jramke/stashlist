import { expect, test } from './fixture';
import { connect, openArticle, openExtensionPage } from './helpers';

test('the icon shows a check on a page that is saved already', async ({
    extension,
}) => {
    await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();

    const badge = () =>
        extension.worker.evaluate(async (id) => {
            const { chrome } = globalThis as unknown as {
                chrome: {
                    action: {
                        getBadgeText: (filter: {
                            tabId: number;
                        }) => Promise<string>;
                    };
                };
            };

            return chrome.action.getBadgeText({ tabId: id });
        }, tabId);

    await article.reload();
    await expect.poll(badge).toBe('');

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await popup.getByRole('button', { name: 'Stash', exact: true }).click();
    await expect(popup.getByText('Stashed.')).toBeVisible();

    await article.reload();
    await expect.poll(badge).toBe('✓');
});
