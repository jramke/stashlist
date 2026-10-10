import { expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

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

    await page.goto('/register');
    await page.getByLabel('Name').fill(person.name);
    await page.getByLabel('Email address').fill(person.email);
    await page.getByLabel('Password', { exact: true }).fill(person.password);
    await page.getByLabel('Confirm password').fill(person.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/stashes$/);

    return person;
}

/** Saves something through the capture box and waits until the server answered. */
export async function capture(page: Page, input: string): Promise<void> {
    await page.getByLabel('Paste a link, a color or a note').fill(input);
    await page.getByRole('button', { name: 'Stash' }).click();

    await expect(
        page.getByLabel('Paste a link, a color or a note'),
    ).toHaveValue('');
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
