import { describe, expect, it } from 'vitest';
import { tokenFrom } from '../lib/connect';

const BASE = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/';

describe('tokenFrom', () => {
    it('takes the token of the answer to this request', () => {
        expect(tokenFrom(`${BASE}#token=7%7Cstl_abc&state=xyz`, 'xyz')).toBe(
            '7|stl_abc',
        );
    });

    it('ignores an answer to another request', () => {
        expect(tokenFrom(`${BASE}#token=7%7Cstl_abc&state=other`, 'xyz')).toBe(
            null,
        );
    });

    it('gives nothing for a denial or no answer', () => {
        expect(tokenFrom(`${BASE}#error=denied&state=xyz`, 'xyz')).toBe(null);
        expect(tokenFrom(undefined, 'xyz')).toBe(null);
    });
});
