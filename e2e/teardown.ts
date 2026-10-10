import { execFileSync } from 'node:child_process';
import { E2E_DOMAIN } from './support';

/**
 * Removes the people the flows signed up, with their stashes the way the app removes them (so the search index
 * and stored files are cleaned too). Only on a developer machine: CI throws its database away.
 */
export default function teardown(): void {
    if (process.env.CI) {
        return;
    }

    const script = `
        App\\Models\\User::query()->where('email', 'like', 'e2e-%@${E2E_DOMAIN}')->each(function ($user) {
            App\\Models\\Stash::query()->where('user_id', $user->id)->each(
                fn ($stash) => app(App\\Actions\\Stashes\\DeleteStash::class)->delete($stash),
            );
            $user->delete();
        });
    `;

    // ddev hands the command to a shell, which would expand the PHP variables; base64 keeps the script intact.
    const encoded = Buffer.from(script).toString('base64');

    execFileSync(
        'ddev',
        [
            'exec',
            `php artisan tinker --execute="$(echo ${encoded} | base64 -d)"`,
        ],
        { stdio: 'pipe' },
    );
}
