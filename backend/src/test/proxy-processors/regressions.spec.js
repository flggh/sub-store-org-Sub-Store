import { expect } from 'chai';
import { describe, it } from 'mocha';

import processors from '@/core/proxy-utils/processors';

describe('Proxy processor regressions', function () {
    it('distinguishes missing and null fields from present falsy fields', function () {
        const filter = processors['Conditional Filter']({
            rule: { attr: 'udp', proposition: 'EXISTS' },
        });
        expect(
            filter.func([
                {},
                { udp: null },
                { udp: false },
                { udp: 0 },
                { udp: '' },
                { udp: true },
            ]),
        ).to.deep.equal([false, false, true, true, true, true]);
    });

    for (const order of ['asc', 'desc', 'original']) {
        for (const expressions of [[], ['^same$']]) {
            it(`keeps equal-name sorting stable for ${order} and ${JSON.stringify(
                expressions,
            )}`, function () {
                const proxies = [
                    { name: 'same', port: 1 },
                    { name: 'same', port: 2 },
                    { name: 'same', port: 3 },
                ];
                const sorter = processors['Regex Sort Operator']({
                    order,
                    expressions,
                });
                expect(
                    sorter.func(proxies).map((proxy) => proxy.port),
                ).to.deep.equal([1, 2, 3]);
            });
        }
    }
});
