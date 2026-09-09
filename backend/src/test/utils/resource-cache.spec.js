import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';

import $ from '@/core/app';
import {
    RESOURCE_CACHE_KEY,
    HEADERS_RESOURCE_CACHE_KEY,
    SCRIPT_RESOURCE_CACHE_KEY,
} from '@/constants';
import resourceCache from '@/utils/resource-cache';
import headersResourceCache from '@/utils/headers-resource-cache';
import scriptResourceCache from '@/utils/script-resource-cache';

for (const [key, singleton] of [
    [RESOURCE_CACHE_KEY, resourceCache],
    [HEADERS_RESOURCE_CACHE_KEY, headersResourceCache],
    [SCRIPT_RESOURCE_CACHE_KEY, scriptResourceCache],
]) {
    describe(`${key} persistence validation`, function () {
        let originals;
        let stored;

        beforeEach(function () {
            originals = { read: $.read, write: $.write, error: $.error };
            $.read = (name) => (name === key ? stored : undefined);
            $.write = (value, name) => {
                if (name === key) stored = value;
            };
            $.error = () => {};
        });

        afterEach(function () {
            Object.assign($, originals);
        });

        for (const invalid of [
            'null',
            '[]',
            'false',
            '0',
            '"text"',
            '{broken',
        ]) {
            it(`resets invalid cache payload ${invalid}`, function () {
                stored = invalid;
                const cache = new singleton.constructor();
                expect(cache.resourceCache).to.deep.equal({});
                expect(stored).to.equal('{}');
            });
        }

        it('removes null and expired entries without discarding valid data', function () {
            const valid = { time: Date.now() + 60000, data: 'cached' };
            stored = JSON.stringify({
                invalid: null,
                expired: { time: 1 },
                valid,
            });
            const cache = new singleton.constructor();
            expect(cache.resourceCache).to.deep.equal({ valid });
            expect(cache.get('valid')).to.equal('cached');
            expect(JSON.parse(stored)).to.deep.equal({ valid });
        });
    });
}
