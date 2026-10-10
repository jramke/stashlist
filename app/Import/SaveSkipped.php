<?php

declare(strict_types=1);

namespace App\Import;

use RuntimeException;

/**
 * An old save that cannot become a stash; the message says why, in a few words that are the same for every row
 * with that problem (they are counted).
 */
final class SaveSkipped extends RuntimeException {}
