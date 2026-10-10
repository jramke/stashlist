<?php

declare(strict_types=1);

namespace App\Import;

use Generator;
use PDO;
use PDOException;
use RuntimeException;

/**
 * Reads the old app's SQL dump (the Turso/SQLite `.dump` of its database) by loading it into a throwaway
 * in-memory SQLite database. Only the `save` table is read; users, sessions, OAuth accounts and groups in the
 * dump are left alone.
 */
final class OldDump
{
    private readonly PDO $db;

    /**
     * @throws RuntimeException when the file cannot be read or is not a dump with a `save` table
     */
    public function __construct(string $path)
    {
        $sql = is_file($path) ? file_get_contents($path) : false;

        if ($sql === false) {
            throw new RuntimeException("Cannot read the dump at {$path}.");
        }

        try {
            $this->db = new PDO('sqlite::memory:', options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $this->db->exec($sql);
            $this->db->query('SELECT 1 FROM save LIMIT 1');
        } catch (PDOException $exception) {
            throw new RuntimeException(
                "This is not a dump of the old app: {$exception->getMessage()}",
                previous: $exception,
            );
        }
    }

    /**
     * The old user whose saves are imported: the one named, or the only one in the dump.
     *
     * @throws RuntimeException when the dump has no saves, not the named user's, or several users' and none is named
     */
    public function ownerFor(?string $named): string
    {
        $owners = $this->owners();

        if ($owners === []) {
            throw new RuntimeException('The dump has no saves.');
        }

        if ($named === null && count($owners) === 1) {
            return $owners[0]['id'];
        }

        foreach ($owners as $owner) {
            if ($owner['id'] === $named) {
                return $named;
            }
        }

        $list = implode('; ', array_map(
            static fn (array $owner): string => "{$owner['id']} ({$owner['name']}, {$owner['saves']} saves)",
            $owners,
        ));

        throw new RuntimeException(
            $named === null
                ? "The dump holds saves of several users. Pass one with --old-user: {$list}"
                : "The dump has no saves of the user {$named}. It has: {$list}",
        );
    }

    /**
     * How many saves each old user has, with the user's name when the dump has the user table.
     *
     * @return list<array{id: string, name: string, saves: int}>
     */
    private function owners(): array
    {
        $names = [];

        if ($this->rows("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user'") !== []) {
            foreach ($this->rows('SELECT id, name, username FROM user') as $user) {
                $names[(string)$user['id']] = trim((string)($user['name'] ?: $user['username']));
            }
        }

        return array_map(
            static fn (array $row): array => [
                'id' => (string)$row['user_id'],
                'name' => $names[(string)$row['user_id']] ?? '',
                'saves' => (int)$row['saves'],
            ],
            $this->rows('SELECT user_id, COUNT(*) AS saves FROM save GROUP BY user_id ORDER BY saves DESC'),
        );
    }

    /**
     * The saves of one old user, oldest first.
     *
     * @return Generator<int, OldSave>
     */
    public function saves(string $oldUserId): Generator
    {
        foreach ($this->rows('SELECT * FROM save WHERE user_id = :user ORDER BY created_at, id', [
            'user' => $oldUserId,
        ]) as $row) {
            yield new OldSave(
                id: (string)$row['id'],
                userId: (string)$row['user_id'],
                type: (string)$row['type'],
                url: (string)$row['url'],
                title: (string)$row['title'],
                description: (string)$row['description'],
                faviconUrl: (string)$row['favicon_url'],
                imageUrl: (string)$row['image_url'],
                text: (string)$row['text'],
                createdAt: (string)$row['created_at'],
            );
        }
    }

    /**
     * @param  array<string, string>  $params
     * @return list<array<string, mixed>>
     */
    private function rows(string $sql, array $params = []): array
    {
        $statement = $this->db->prepare($sql) ?: throw new RuntimeException("Cannot read the dump: {$sql}");
        $statement->execute($params);

        /** @var list<array<string, mixed>> */
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
