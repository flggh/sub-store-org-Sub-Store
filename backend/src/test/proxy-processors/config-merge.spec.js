import { expect } from 'chai';

import { ProxyUtils } from '@/core/proxy-utils';
import YAML from '@/utils/yaml';

async function mergeConfig(config, patch) {
    const output = await ProxyUtils.process(
        {
            $file: { type: 'mihomoConfig' },
            $content: YAML.safeDump(config),
        },
        [{ type: 'Script Operator', args: { mode: 'script', content: patch } }],
        'Mihomo',
    );
    return YAML.safeLoad(output.$content);
}

describe('Mihomo configuration merge', function () {
    for (const initial of [false, 0, '', true, 'text', [], null]) {
        it(`replaces a non-object value ${JSON.stringify(
            initial,
        )} with an object`, async function () {
            expect(
                await mergeConfig({ dns: initial }, 'dns:\n  enable: true'),
            ).to.deep.equal({ dns: { enable: true } });
        });

        for (const operation of ['+proxies', 'proxies+']) {
            it(`replaces a non-array value ${JSON.stringify(
                initial,
            )} before ${operation}`, async function () {
                expect(
                    await mergeConfig(
                        { proxies: initial },
                        `${operation}:\n  - name: Direct\n    type: direct`,
                    ),
                ).to.deep.equal({
                    proxies: [{ name: 'Direct', type: 'direct' }],
                });
            });
        }
    }

    it('merges objects and preserves false and zero scalar values', async function () {
        expect(
            await mergeConfig(
                { dns: { enable: true, port: 53 } },
                'dns:\n  enable: false\n  port: 0',
            ),
        ).to.deep.equal({ dns: { enable: false, port: 0 } });
    });

    it('preserves the order of prepended and appended arrays', async function () {
        expect(
            await mergeConfig(
                { rules: ['middle'] },
                '+rules: [first]\nrules+: [last]',
            ),
        ).to.deep.equal({ rules: ['first', 'middle', 'last'] });
    });

    it('supports forced replacement and wrapped object and scalar keys', async function () {
        expect(
            await mergeConfig(
                { dns: { old: true }, enabled: true },
                'dns!: {new: true}\n<extra>: {nested: true}\n<enabled>: false',
            ),
        ).to.deep.equal({
            dns: { new: true },
            extra: { nested: true },
            enabled: false,
        });
    });

    it('does not merge into inherited prototypes', async function () {
        try {
            const output = await mergeConfig(
                {},
                '__proto__: {subStoreMergeProbe: true}\nconstructor: {prototype: {subStoreMergeProbe: true}}',
            );
            expect(Object.prototype).to.not.have.property('subStoreMergeProbe');
            expect(Object.getPrototypeOf(output)).to.equal(Object.prototype);
            expect(
                Object.prototype.hasOwnProperty.call(output, '__proto__'),
            ).to.equal(true);
        } finally {
            delete Object.prototype.subStoreMergeProbe;
        }
    });
});
