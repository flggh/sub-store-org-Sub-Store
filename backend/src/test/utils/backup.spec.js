import { expect } from 'chai';
import { describe, it } from 'mocha';
import { Base64 } from 'js-base64';

import { parseBackupContent } from '@/utils/backup';

describe('Backup validation', function () {
    const content = {
        settings: { name: '中文备份', gistToken: 'secret' },
        subs: { old: { name: 'old' } },
    };

    for (const [encoding, encode] of [
        ['JSON', (value) => value],
        ['Base64', Base64.encode],
    ]) {
        it(`accepts ${encoding} backups, whitespace and legacy collection shapes`, function () {
            expect(
                parseBackupContent(
                    `\uFEFF ${encode(JSON.stringify(content))}\n`,
                ),
            ).to.deep.equal(content);
        });

        for (const invalid of [
            null,
            [],
            'text',
            1,
            false,
            {},
            { settings: null },
            { settings: [] },
            { settings: 'text' },
            { settings: 1 },
        ]) {
            it(`rejects invalid ${encoding} structure ${JSON.stringify(
                invalid,
            )}`, function () {
                expect(() =>
                    parseBackupContent(encode(JSON.stringify(invalid))),
                ).to.throw('settings');
            });
        }
    }

    for (const input of [
        undefined,
        null,
        {},
        [],
        1,
        false,
        '',
        'not-json',
        '{"secret":"sensitive-value"',
        Base64.encode('not-json'),
    ]) {
        it(`rejects malformed backup input ${JSON.stringify(
            input,
        )} without exposing content`, function () {
            let error;
            try {
                parseBackupContent(input);
            } catch (caught) {
                error = caught;
            }
            expect(error).to.be.instanceOf(Error);
            expect(error.message).not.to.include('sensitive-value');
        });
    }
});
