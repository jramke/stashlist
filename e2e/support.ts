import { expect, type Locator, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/** Where the app runs: the DDEV site, or whatever CI serves. */
export const BASE_URL =
    process.env.E2E_BASE_URL ?? 'https://stashlist.ddev.site';

/** Every user the flows create has an address like this, which is how the teardown finds them again. */
export const E2E_DOMAIN = 'example.test';

export type Person = { name: string; email: string; password: string };

/** Signs a new person up through the form and waits for their empty feed. */
export async function register(page: Page): Promise<Person> {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const person = {
        name: 'E2E Person',
        email: `e2e-${unique}@${E2E_DOMAIN}`,
        password: 'E2e-Passw0rd!-long-enough',
    };

    await page.goto(`${BASE_URL}/register`);
    await page.getByLabel('Name').fill(person.name);
    await page.getByLabel('Email address').fill(person.email);
    await page.getByLabel('Password', { exact: true }).fill(person.password);
    await page.getByLabel('Confirm password').fill(person.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/stashes$/);
    // The box takes the focus once the page is alive; typing before that goes to markup nobody listens to yet.
    await expect(page.getByRole('combobox')).toBeFocused();

    return person;
}

/** The one box of the feed: it searches, filters and stashes. */
export function box(page: Page): Locator {
    return page.getByRole('combobox');
}

/**
 * Saves something through the box and waits until the server answered. Enter saves a link or a color code; a
 * note needs Ctrl or Cmd with Enter, so a search typed by habit never becomes a note.
 */
export async function capture(page: Page, input: string): Promise<void> {
    await box(page).fill(input);
    await box(page).press('ControlOrMeta+Enter');

    await expect(box(page)).toHaveValue('');
}

/** Opens the menu behind the person's initial and picks an entry. */
export async function menu(page: Page, item: string): Promise<void> {
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('menuitem', { name: item }).click();
}

/** Types a word into the box and turns the first suggestion into a filter with Tab. */
export async function filterBy(page: Page, word: string): Promise<void> {
    await box(page).fill(word);
    await expect(page.getByRole('option').first()).toBeVisible();
    await box(page).press('Tab');
}

/**
 * Background jobs (index writes, extraction) run on the queue. In CI the queue is synchronous and there is
 * nothing to wait for; locally a worker runs until the queue is empty.
 */
export function drainQueue(): void {
    if (process.env.E2E_QUEUE === 'sync') {
        return;
    }

    execFileSync(
        'ddev',
        [
            'exec',
            'php',
            'artisan',
            'queue:work',
            'redis',
            '--stop-when-empty',
            '--queue=scrape,index,default,maintenance',
        ],
        { stdio: 'pipe' },
    );
}
