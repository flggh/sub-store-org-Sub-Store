import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';

import $ from '@/core/app';
import { MODULES_KEY, RULES_KEY } from '@/constants';
import { produceArtifact } from '@/restful/sync';

describe('Rule artifact synchronization', function () {
    let originals;
    let state;

    beforeEach(function () {
        originals = { read: $.read, info: $.info, error: $.error };
        state = {
            [RULES_KEY]: [
                {
                    name: 'test',
                    urls: ['/api/module/first', '/api/module/second'],
                },
            ],
            [MODULES_KEY]: [
                {
                    name: 'first',
                    content: 'DOMAIN,example.com\nIP-CIDR,10.0.0.0/8',
                },
                {
                    name: 'second',
                    content:
                        'DOMAIN,example.com\nIP-CIDR,10.0.0.0/8,no-resolve',
                },
            ],
        };
        $.read = (key) => state[key];
        $.info = () => {};
        $.error = () => {};
    });

    afterEach(function () {
        Object.assign($, originals);
    });

    it('consumes downloaded text and deduplicates rules without dropping options', async function () {
        expect(
            await produceArtifact({
                type: 'rule',
                name: 'test',
                platform: 'Surge',
            }),
        ).to.equal(
            'DOMAIN,example.com\nIP-CIDR,10.0.0.0/8\nIP-CIDR,10.0.0.0/8,no-resolve',
        );
    });

    it('handles missing rule URLs as an empty list', async function () {
        delete state[RULES_KEY][0].urls;
        expect(
            await produceArtifact({
                type: 'rule',
                name: 'test',
                platform: 'Surge',
            }),
        ).to.equal('');
    });
});
